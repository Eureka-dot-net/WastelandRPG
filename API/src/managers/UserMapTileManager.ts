import { ClientSession } from "mongoose";
import { Colony } from "../models/Player/Colony";
import { IUserMapTile, UserMapTile, UserMapTileDoc } from "../models/Player/UserMapTile";
import { ColonyManager } from "./ColonyManager";
import { calculateDistance, calculateDistanceModifiers } from "../utils/gameUtils";
import { createOrUpdateMapTile } from "../utils/mapUtils";

export class UserMapTileManager {
    private _colonyManager?: ColonyManager;
    constructor(private userMapTile: UserMapTileDoc, colonyManager?: ColonyManager) {
        if (colonyManager) {
            this._colonyManager = colonyManager;
        }
    }

    get id(): string {
        return this.userMapTile._id.toString();
    }

    async getColony(): Promise<ColonyManager> {
        if (this._colonyManager) {
            return this._colonyManager;
        }
        const colony = await Colony.findById(this.userMapTile.colonyId);
        if (!colony) throw new Error('Colony not found for user map tile');
        this._colonyManager = new ColonyManager(colony);
        return this._colonyManager;
    }

    async setExplored(session: ClientSession): Promise<void> {
        if (!this.userMapTile.isExplored) {
            this.userMapTile.isExplored = true;
            await this.userMapTile.save({ session });
        }
        const { x, y } = this.userMapTile;
        const adjacentOffsets = [
            { dx: 0, dy: 1 },  // up
            { dx: 0, dy: -1 }, // down
            { dx: 1, dy: 0 },  // right
            { dx: -1, dy: 0 }  // left
        ];
        const colony = await this.getColony();
        // Run all createIfNotExists calls in parallel
        await Promise.all(adjacentOffsets.map(({ dx, dy }) =>
            UserMapTileManager.createIfNotExists(colony, x + dx, y + dy, session)
        ));
    }

    /**
     * Static method to create or fetch a UserMapTile, and return a UserMapTileManager
     */
    static async createIfNotExists(colony: ColonyManager, x: number, y: number, session: ClientSession): Promise<UserMapTileManager> {
        let userMapTile = await UserMapTile.findOne({
            colonyId: colony.id,
            x: x,
            y: y
        }).session(session);

        if (!userMapTile) {
            const serverTile = await createOrUpdateMapTile(colony.serverId, x, y, session);
            const distance = calculateDistance(colony.homesteadLocation.x, colony.homesteadLocation.y, x, y);
            const distanceModifiers = calculateDistanceModifiers(distance);
            const baseDuration = 300000; // 5 minutes
            const distanceDuration = baseDuration * distanceModifiers.durationMultiplier;

            const userMapTileData: IUserMapTile = {
                serverTile: serverTile._id,
                x,
                y,
                terrain: serverTile.terrain,
                icon: serverTile.icon,
                colonyId: colony.id.toString(),
                exploredAt: new Date(), // required by your interface
                isExplored: false,
                distanceFromHomestead: distance,
                explorationTime: distanceDuration,
                lootMultiplier: distanceModifiers.lootMultiplier
            };

            userMapTile = new UserMapTile(userMapTileData);
            await userMapTile.save({ session });
        }
        return new UserMapTileManager(userMapTile);
    }
}