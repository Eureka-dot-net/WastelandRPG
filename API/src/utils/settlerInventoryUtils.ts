import itemsCatalogue from '../data/itemsCatalogue.json';

/**
 * Get item details from the catalogue
 * This is a utility function that can be used by any part of the codebase
 */
export function getItemFromCatalogue(itemId: string) {
  return itemsCatalogue.find(item => item.itemId === itemId);
}

/**
 * Legacy functions for backward compatibility - these now use SettlerManager internally
 * @deprecated Use SettlerManager methods instead
 */
import { SettlerManager } from '../managers/SettlerManager';
import { ISettler, ISettlerItem, SettlerDoc } from '../models/Player/Settler';
import { ClientSession } from 'mongoose';

/**
 * @deprecated Use SettlerManager.carryingCapacity instead
 */
export function calculateCarryingCapacity(strength: number): number {
  return Math.max(10, strength * 5);
}

/**
 * @deprecated Use SettlerManager.currentCarriedWeight instead
 */
export function calculateCurrentCarriedWeight(carriedItems: ISettlerItem[]): number {
  let totalWeight = 0;
  
  for (const carriedItem of carriedItems) {
    const catalogueItem = getItemFromCatalogue(carriedItem.itemId);
    if (catalogueItem && catalogueItem.properties?.weight) {
      const itemWeight = catalogueItem.properties.weight as number;
      totalWeight += itemWeight * carriedItem.quantity;
    }
  }
  
  return totalWeight;
}

/**
 * @deprecated Use SettlerManager.canCarryItems instead
 */
export function canCarryItems(
  settler: ISettler, 
  itemId: string, 
  quantity: number = 1
): { canCarry: boolean; reason?: string; details: { currentSlots: number; maxSlots: number; currentWeight: number; maxWeight: number; itemWeight: number } } {
  // Create a temporary SettlerManager instance for compatibility
  const manager = new SettlerManager(settler as SettlerDoc);
  return manager.canCarryItems(itemId, quantity);
}

/**
 * @deprecated Use SettlerManager.addItems instead
 */
export function addItemsToSettlerInventory(
  settler: ISettler,
  itemId: string,
  requestedQuantity: number
): { added: number; reason?: string } {
  // Create a temporary SettlerManager instance for compatibility
  const manager = new SettlerManager(settler as SettlerDoc);
  return manager.addItems(itemId, requestedQuantity);
}

/**
 * @deprecated Use SettlerManager.transferItemsToColony instead
 */
export async function transferSettlerItemsToColony(
  settler: SettlerDoc,
  colonyId: string,
  session: ClientSession
): Promise<{ transferredItems: Record<string, number>; remainingItems?: Record<string, number> }> {
  const manager = new SettlerManager(settler);
  const result = await manager.transferItemsToColony(colonyId, session);
  return {
    transferredItems: result.transferredItems,
    remainingItems: result.remainingItems
  };
}

/**
 * @deprecated Use SettlerManager.giveRewards instead
 */
export async function giveRewardsToSettler(
  settler: SettlerDoc,
  rewards: Record<string, number>,
  session: ClientSession
): Promise<{ settlerItems: Record<string, number>; overflow: Record<string, number> }> {
  const manager = new SettlerManager(settler);
  return manager.giveRewards(rewards, session);
}