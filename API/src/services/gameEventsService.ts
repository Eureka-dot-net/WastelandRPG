/**
 * Shared service for handling completion of game events like assignments, explorations, farming, crafting, etc.
 * This centralizes common functionality like inventory management, settler discovery, and event completion logic.
 */

import { Inventory } from "../models/Player/Inventory";
import { Settler } from "../models/Player/Settler";
import { ColonyDoc } from "../models/Player/Colony";
import { ColonyManager } from "../managers/ColonyManager";
import { generateSettler } from "./settlerGenerator";
import { ClientSession } from "mongoose";
import itemsCatalogue from '../data/itemsCatalogue.json';

function getItemCatalogue(itemId: string) {
  return itemsCatalogue.find(item => item.itemId === itemId);
}

/**
 * Add rewards to colony inventory - shared by all game events
 */
export async function addRewardsToColonyInventory(colonyId: string, session: ClientSession, rewards: Record<string, number>) {
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

/**
 * Generic settler discovery logic based on event type and colony size
 */
export async function shouldFindSettlerDuringEvent(
  colony: ColonyDoc, 
  eventType: string,
  eventDoc?: any,
  eventTypeData?: any
): Promise<boolean> {
  const currentSettlers = colony.settlers.length;
  
  // Handle assignment-specific logic
  if (eventType === 'assignment' && eventTypeData?.getTaskData) {
    const taskData = eventTypeData.getTaskData(eventDoc);
    if (taskData?.specialRewards?.findSettler?.scaling) {
      const scaling = taskData.specialRewards.findSettler.scaling;
      const bracket = scaling.find((s: any) => 
        currentSettlers >= s.minSettlers && currentSettlers <= s.maxSettlers
      );
      return bracket ? Math.random() <= bracket.chance : false;
    }
  }
  
  // Base chances vary by event type
  let baseChance: number;
  switch (eventType) {
    case 'assignment':
      baseChance = 0.15; // 15% default for assignments
      break;
    case 'exploration':
      baseChance = 0.05; // 5% base chance for exploration
      break;
    case 'farming':
      baseChance = 0.02; // 2% for farming (settlers might seek food/safety)
      break;
    case 'crafting':
      baseChance = 0.01; // 1% for crafting (less likely to find people)
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
export async function completeGameEvent(
  eventDoc: any,
  colony: ColonyDoc,
  session: ClientSession,
  eventType: string,
  eventTypeData?: any
): Promise<{
  logEntry: string;
  settlerFound: boolean;
  newSettler?: any;
}> {
  // Mark event as completed
  eventDoc.state = 'completed';

  // Free up the assigned settler
  if (eventDoc.settlerId) {
    await Settler.findByIdAndUpdate(eventDoc.settlerId, { status: 'idle' }, { session });
  }

  // Add planned rewards to inventory
  if (eventDoc.plannedRewards) {
    await addRewardsToColonyInventory(colony._id.toString(), session, eventDoc.plannedRewards);
  }

  // Check for settler discovery
  const foundSettler = await shouldFindSettlerDuringEvent(colony, eventType, eventDoc, eventTypeData);
  let newSettler = null;
  
  if (foundSettler) {
    newSettler = await generateSettler(colony._id.toString(), session, {
      assignInterests: true,
      isActive: false,
    });
    eventDoc.settlerFoundId = newSettler._id;
  }

  // Generate appropriate log entry
  let eventName: string;
  let locationInfo = '';
  
  switch (eventType) {
    case 'assignment':
      eventName = eventDoc.name || eventDoc.taskId;
      break;
    case 'exploration':
      eventName = 'Exploration';
      locationInfo = ` at (${eventDoc.x}, ${eventDoc.y})`;
      break;
    case 'farming':
      eventName = 'Farming';
      locationInfo = eventDoc.cropType ? ` (${eventDoc.cropType})` : '';
      break;
    case 'crafting':
      eventName = 'Crafting';
      locationInfo = eventDoc.recipeId ? ` (${eventDoc.recipeId})` : '';
      break;
    default:
      eventName = eventType;
      break;
  }

  const baseLogMessage = `${eventName}${locationInfo} completed. Rewards ${JSON.stringify(eventDoc.plannedRewards)}`;
  const logEntry = foundSettler 
    ? `${baseLogMessage}. A settler was found and is waiting for your decision!`
    : baseLogMessage;

  return {
    logEntry,
    settlerFound: foundSettler,
    newSettler
  };
}

/**
 * Complete all events of a specific type for a colony
 */
export async function completeGameEventsForColony(
  colony: ColonyDoc,
  session: ClientSession,
  eventType: string,
  eventModel: any,
  eventTypeData?: any,
  now: Date = new Date()
) {
  const events = await eventModel.find({
    colonyId: colony._id,
    state: 'in-progress',
    completedAt: { $lte: now }
  }).session(session);

  if (!events.length) return;

  const colonyManager = new ColonyManager(colony);
  const logEntries: string[] = [];

  for (const event of events) {
    const result = await completeGameEvent(event, colony, session, eventType, eventTypeData);
    logEntries.push(result.logEntry);
  }

  // Save all events
  await Promise.all([
    ...events.map((e: any) => e.save({ session }))
  ]);

  // Add logs after saving to avoid partial state issues
  for (let i = 0; i < logEntries.length; i++) {
    const entry = logEntries[i];
    const event = events[i];
    const meta = event.settlerFoundId ? { settlerId: event.settlerFoundId } : undefined;
    await colonyManager.addLogEntry(session, eventType, entry, meta);
  }
}

/**
 * Generate rewards from reward definition (cleaningTasksCatalogue format)
 */
export function generateRewardsFromDefinition(rewardsDefinition: Record<string, {min: number, max: number, chance: number}>): Record<string, number> {
  const rewards: Record<string, number> = {};
  
  for (const [itemId, config] of Object.entries(rewardsDefinition)) {
    // Roll for chance
    if (Math.random() <= config.chance) {
      // Generate amount within min/max range
      const amount = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
      rewards[itemId] = amount;
    }
  }
  
  return rewards;
}