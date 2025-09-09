import { AssignmentDoc } from "../models/Player/Assignment";
import { Colony } from "../models/Player/Colony";
import { ColonyManager } from "./ColonyManager";
import cleaningTasksCatalogue from '../data/cleaningTasksCatalogue.json';
import { ClientSession } from "mongoose";
import { Settler } from "../models/Player/Settler";
import { generateSettler } from "../services/settlerGenerator";
import { SettlerManager } from "./SettlerManager";
import { UserMapTileManager } from "./UserMapTileManager";

export class AssignmentManager {
    
    private _colonyManager?: ColonyManager;

    constructor(
        private assignment: AssignmentDoc,
        colonyManager?: ColonyManager
    ) {
        if (colonyManager) {
            this._colonyManager = colonyManager;
        }
    }

    get id(): string {
        return this.assignment._id.toString();
    }

    async getColony(): Promise<ColonyManager> {
        if (this._colonyManager) {
            return this._colonyManager;
        }
        const colony = await Colony.findById(this.assignment.colonyId);
        if (!colony) throw new Error('Colony not found for assignment');
        this._colonyManager = new ColonyManager(colony);
        return this._colonyManager;
    }
    /**
    * Generic settler discovery logic based on event type and colony size
    */
    async shouldFindSettler(): Promise<boolean> {
        const colony = await this.getColony();
        if (!colony.canFindSettlerOrPrisoner()) {
            return false; // Colony is at max settler capacity
        }
        const currentSettlers = colony.getNumberOfSettlers();

        // Handle assignment-specific logic
        if (this.assignment.type === 'quest') {
            const taskType = cleaningTasksCatalogue.find(task => task.taskId === this.assignment.taskId) || undefined;
            if (taskType?.specialRewards?.findSettler?.scaling) {
                const scaling = taskType.specialRewards.findSettler.scaling;
                const bracket = scaling.find((s: any) =>
                    currentSettlers >= s.minSettlers && currentSettlers <= s.maxSettlers
                );
                return bracket ? Math.random() <= bracket.chance : false;
            }
        }

        // Base chances vary by event type
        let baseChance: number;
        switch (this.assignment.type) {
            case 'exploration':
                baseChance = 0.05; // 5% base chance for exploration
                break;
            case 'farming':
                baseChance = 0.02; // 2% for farming (settlers might seek food/safety)
                break;
            case 'crafting':
                baseChance = 0; // 0% for crafting (less likely to find people)
                break;
            default:
                baseChance = 0.03; // 3% default
                break;
        }

        // Apply diminishing returns as colony grows
        const scalingFactor = Math.max(0.1, 1 - (currentSettlers * 0.1));
        const adjustedChance = baseChance * scalingFactor;

        const roll = Math.random();
        return roll <= adjustedChance;
    }

    /**
     * Complete a single game event (assignment, exploration, etc.)
     */
    async completeAssignment(
        session: ClientSession,
    ): Promise<{
        logEntry: string;
        settlerFound: boolean;
        newSettler?: any;
        actualTransferredItems?: Record<string, number>;
        actualNewInventoryStacks?: number;
    }> {
        const colonyManager = await this.getColony();
        // Mark event as completed
        this.assignment.state = 'completed';

        let actualTransferredItems: Record<string, number> = {};
        let actualNewInventoryStacks = 0;

        // Free up the assigned settler and handle their return with items
        if (this.assignment.settlerId) {

            const assignedSettler = await Settler.findById(this.assignment.settlerId).session(session);
            if (assignedSettler) {

                const settlerManager = new SettlerManager(assignedSettler, colonyManager);

                // Update settler status using SettlerManager to properly handle energy
                await settlerManager.changeStatus('idle', this.assignment.completedAt || new Date(), session);

                // If there are planned rewards, first give them to the settler (they found items during exploration)
                // Then transfer everything from settler to colony (settler returns home and deposits items)
                if (this.assignment.plannedRewards) {
                    // Step 1: Give rewards to settler (simulating finding items during exploration)
                    await settlerManager.giveRewards(this.assignment.plannedRewards, session);

                    // Step 2: Settler returns home and deposits everything to colony
                    const transferResult = await settlerManager.transferItemsToColony(session);
                    actualTransferredItems = transferResult.transferredItems;

                } else {
                    // No rewards - just save the settler status change
                    await assignedSettler.save({ session });
                }
            }
        }
        // Check for settler discovery
        const foundSettler = await this.shouldFindSettler();
        let newSettler = null;

        if (foundSettler) {
            newSettler = await generateSettler(colonyManager.id, session, {
                assignInterests: true,
                isActive: false,
            });
            this.assignment.settlerFoundId = newSettler._id;
        }

        // Handle exploration-specific completion logic
        if (this.assignment.type === 'exploration' && this.assignment.location) {
            const { x, y } = this.assignment.location;

            const userMapTileManager = await UserMapTileManager.createIfNotExists(colonyManager, x, y, session);
            // update map tile to mark as colony-explored
            await userMapTileManager.setExplored(session);
        }

        this.assignment.actualTransferredItems = actualTransferredItems;

        const baseLogMessage = `${this.assignment.name} completed. Rewards ${JSON.stringify(this.assignment.plannedRewards)}`;
        const logEntry = foundSettler
            ? `${baseLogMessage}. A settler was found and is waiting for your decision!`
            : baseLogMessage;

        return {
            logEntry,
            settlerFound: foundSettler,
            newSettler,
            actualTransferredItems,
            actualNewInventoryStacks
        };
    }
}