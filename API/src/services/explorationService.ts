import { ExplorationDoc, ExplorationModel } from "../models/Server/Exploration";
import { Settler } from "../models/Player/Settler";
import { Inventory } from "../models/Player/Inventory";
import { ColonyDoc } from "../models/Player/Colony";
import { ColonyManager } from "../managers/ColonyManager";
import { generateSettler } from "./settlerGenerator";
import { ClientSession } from "mongoose";
import itemsCatalogue from '../data/itemsCatalogue.json';
import terrainCatalogue from '../data/terrainCatalogue.json';

function getItemCatalogue(itemId: string) {
  return itemsCatalogue.find(item => item.itemId === itemId);
}

async function addRewardsToColonyInventory(colonyId: string, session: ClientSession, rewards: Record<string, number>) {
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
    if (!catalogueItem) {
      console.warn(`Item ${itemId} not found in catalogue, skipping`);
      continue;
    }

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

export async function didFindSettlerInExploration(exploration: ExplorationDoc, colony: ColonyDoc): Promise<boolean> {
  // Base chance of 5% to find a settler during exploration
  // Higher chance in certain terrain types
  const terrainData = terrainCatalogue.find(t => t.terrainId === 'residential' || t.terrainId === 'center');
  let baseChance = 0.05; // 5% base chance

  // Increase chance for residential and center areas
  if (exploration.x !== undefined && exploration.y !== undefined) {
    // We'd need to check the actual terrain at these coordinates
    // For now, just use base chance
    baseChance = 0.05;
  }

  // Reduce chance as colony grows (diminishing returns)
  const currentSettlers = colony.settlers.length;
  const scalingFactor = Math.max(0.1, 1 - (currentSettlers * 0.1));
  const adjustedChance = baseChance * scalingFactor;

  const roll = Math.random();
  return roll <= adjustedChance;
}

export async function completeExplorationsForColony(colony: ColonyDoc, session: ClientSession, now: Date = new Date()) {
  const explorations: ExplorationDoc[] = await ExplorationModel.find({
    colonyId: colony._id,
    state: 'in-progress',
    completedAt: { $lte: now }
  }).session(session);

  if (!explorations.length) return;

  const colonyManager = new ColonyManager(colony);
  const logEntries: string[] = [];

  for (const exploration of explorations) {
    exploration.state = 'completed';

    // Free up the assigned settler
    await Settler.findByIdAndUpdate(exploration.settlerId, { status: 'idle' }, { session });

    // Add planned rewards
    if (exploration.plannedRewards) {
      await addRewardsToColonyInventory(colony._id.toString(), session, exploration.plannedRewards);
    }

    // Check for special reward: find a settler
    const foundSettler = await didFindSettlerInExploration(exploration, colony);
    if (foundSettler) {
      const newSettler = await generateSettler(colony._id.toString(), session, {
        assignInterests: true,
        isActive: false,
      });

      exploration.settlerFoundId = newSettler._id;

      logEntries.push(`Exploration at (${exploration.x}, ${exploration.y}) completed. Rewards ${JSON.stringify(exploration.plannedRewards)}. A new settler has joined the colony!`);
    } else {
      logEntries.push(`Exploration at (${exploration.x}, ${exploration.y}) completed. Rewards ${JSON.stringify(exploration.plannedRewards)}`);
    }
  }

  // Save all explorations
  await Promise.all([
    ...explorations.map(e => e.save({ session }))
  ]);

  // Add logs after saving to avoid partial state issues
  for (const entry of logEntries) {
    await colonyManager.addLogEntry(session, 'exploration', entry, undefined);
  }
}