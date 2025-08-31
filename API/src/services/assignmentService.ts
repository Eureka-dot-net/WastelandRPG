import { AssignmentDoc, Assignment } from "../models/Player/Assignment";
import { Inventory } from "../models/Player/Inventory";
import { Settler } from "../models/Player/Settler";
import itemsCatalogue from '../data/itemsCatalogue.json';
import { ColonyDoc } from "../models/Player/Colony";
import { ColonyManager } from "../managers/ColonyManager";
import cleaningTasksCatalogue from "../data/cleaningTasksCatalogue.json";
import { generateSettler } from "./settlerGenerator";
import { ClientSession } from "mongoose";

function getItemCatalogue(itemId: string) {
  return itemsCatalogue.find(item => item.itemId === itemId);
}

async function addRewardsToColonyInventory(colonyId: string, session: ClientSession, rewards: Record<string, number>) {
  //todo: inventory should not exceed max size
  if (!colonyId) throw new Error("colonyId required!");

  let inventory = await Inventory.findOne({ colonyId }).session(session);

  // If no inventory exists, create one
  if (!inventory) {
    inventory = new Inventory({
      colonyId,
      items: [],
    });
  }

  for (const [itemId, qty] of Object.entries(rewards)) {
    if (qty <= 0) continue;
    const catalogueItem = getItemCatalogue(itemId);
    if (!catalogueItem) throw new Error(`Item ${itemId} not found in catalogue`);

    // Find item in inventory
    const invItem = inventory.items.find(item => item.itemId === itemId);
    if (invItem) {
      invItem.quantity += qty;
    } else {
      inventory.items.push({
        itemId,
        name: catalogueItem.name,
        icon: catalogueItem.icon,
        quantity: qty,
        type: catalogueItem.type,
        properties: catalogueItem.properties || {},
      });
    }
  }

  await inventory.save({ session });
}

export async function didFindSettler(assignment: AssignmentDoc, colony: ColonyDoc) {
  const taskDef = cleaningTasksCatalogue.find(task => task.taskId === assignment.taskId);
  if (!taskDef?.specialRewards?.findSettler?.scaling) return false;

  const currentSettlers = colony.settlers.length;

  // Find the scaling bracket for the current settler count
  const bracket = taskDef.specialRewards.findSettler.scaling.find(
    (s: { minSettlers: number; maxSettlers: number; chance: number }) =>
      currentSettlers >= s.minSettlers && currentSettlers <= s.maxSettlers
  );

  if (!bracket) return false; // no chance if no bracket matches

  const roll = Math.random(); // 0 <= roll < 1
  if (roll <= bracket.chance) {
    return true;
  }

  return false;
}

export async function completeAssignmentsForColony(colony: ColonyDoc, session: ClientSession, now: Date = new Date()) {
  const assignments: AssignmentDoc[] = await Assignment.find({
    colonyId: colony._id,
    state: 'in-progress',
    completedAt: { $lte: now }
  }).session(session);

  if (!assignments.length) return;

  const colonyManager = new ColonyManager(colony);
  const logEntries: string[] = [];

  for (const assignment of assignments) {
    assignment.state = 'completed';

    // Free up the assigned settler
    if (assignment.settlerId) {
      await Settler.findByIdAndUpdate(assignment.settlerId, { status: 'idle' }, { session });
    }

    // Add normal rewards
    if (assignment.plannedRewards) {
      await addRewardsToColonyInventory(colony._id.toString(), session, assignment.plannedRewards);
    }

    // Check for special reward: find a settler
    const foundSettler = await didFindSettler(assignment, colony);
    if (foundSettler) {
      const newSettler = await generateSettler(colony._id.toString(), session, {
        assignInterests: true,
        isActive: false,
      });

      assignment.settlerFoundId = newSettler._id;
      colony.settlers.push(newSettler);

      logEntries.push(`Assignment '${assignment.name}' completed. Rewards ${JSON.stringify(assignment.plannedRewards)}. A new settler has joined the colony!`);
    } else {
      logEntries.push(`Assignment '${assignment.name}' completed. Rewards ${JSON.stringify(assignment.plannedRewards)}`);
    }
  }

  // Save all assignments and colony in parallel, using session
  await Promise.all([
    ...assignments.map(a => a.save({ session })),
    colony.save({ session })
  ]);

  // Add logs after saving to avoid partial state issues
  for (const entry of logEntries) {
    await colonyManager.addLogEntry(session, 'assignment', entry, undefined);
  }
}