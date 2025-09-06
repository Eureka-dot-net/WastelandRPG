import { ISettler, ISettlerItem, SettlerDoc } from '../models/Player/Settler';
import itemsCatalogue from '../data/itemsCatalogue.json';
import { addRewardsToColonyInventory } from '../services/gameEventsService';
import { ClientSession } from 'mongoose';

/**
 * Get item details from the catalogue
 */
export function getItemFromCatalogue(itemId: string) {
  return itemsCatalogue.find(item => item.itemId === itemId);
}

/**
 * Calculate settler's maximum carrying capacity based on strength
 * Formula: strength 10 = weight capacity 50, scale proportionally
 * Minimum capacity is 10 (for strength 2), maximum is 100 (for strength 20)
 */
export function calculateCarryingCapacity(strength: number): number {
  // strength * 5 = capacity
  // strength 2 -> 10, strength 10 -> 50, strength 20 -> 100
  return Math.max(10, strength * 5);
}

/**
 * Calculate total weight of items currently carried by settler
 */
export function calculateCurrentCarriedWeight(carriedItems: ISettlerItem[]): number {
  let totalWeight = 0;
  
  for (const carriedItem of carriedItems) {
    const catalogueItem = getItemFromCatalogue(carriedItem.itemId);
    if (catalogueItem && catalogueItem.properties?.weight) {
      // For stackable items, multiply weight by quantity
      const itemWeight = catalogueItem.properties.weight as number;
      totalWeight += itemWeight * carriedItem.quantity;
    }
  }
  
  return totalWeight;
}

/**
 * Check if settler can carry additional items without exceeding limits
 */
export function canCarryItems(
  settler: ISettler, 
  itemId: string, 
  quantity: number = 1
): { canCarry: boolean; reason?: string; details: { currentSlots: number; maxSlots: number; currentWeight: number; maxWeight: number; itemWeight: number } } {
  
  const catalogueItem = getItemFromCatalogue(itemId);
  if (!catalogueItem) {
    return {
      canCarry: false,
      reason: `Item ${itemId} not found in catalogue`,
      details: { currentSlots: 0, maxSlots: 0, currentWeight: 0, maxWeight: 0, itemWeight: 0 }
    };
  }

  const itemWeight = (catalogueItem.properties?.weight as number) || 1;
  const maxWeight = calculateCarryingCapacity(settler.stats.strength);
  const currentWeight = calculateCurrentCarriedWeight(settler.carry);
  const maxSlots = settler.maxCarrySlots;
  
  // Check if item is already being carried (for stackable items)
  const existingItem = settler.carry.find(item => item.itemId === itemId);
  const isStackable = catalogueItem.properties?.stackable === true;
  
  let currentSlots = settler.carry.length;
  let additionalWeight = itemWeight * quantity;
  
  if (existingItem && isStackable) {
    // Adding to existing stack - no additional slot needed
    // Weight calculation remains the same
  } else {
    // New item slot needed
    if (currentSlots >= maxSlots) {
      return {
        canCarry: false,
        reason: `Not enough inventory slots (${currentSlots}/${maxSlots} full)`,
        details: { currentSlots, maxSlots, currentWeight, maxWeight, itemWeight }
      };
    }
  }
  
  // Check weight limit
  if (currentWeight + additionalWeight > maxWeight) {
    return {
      canCarry: false,
      reason: `Item too heavy (current: ${currentWeight.toFixed(1)}, adding: ${additionalWeight.toFixed(1)}, max: ${maxWeight})`,
      details: { currentSlots, maxSlots, currentWeight, maxWeight, itemWeight }
    };
  }
  
  return {
    canCarry: true,
    details: { currentSlots, maxSlots, currentWeight, maxWeight, itemWeight }
  };
}

/**
 * Add items to settler's inventory if possible
 * Returns the actual quantity added (may be less than requested due to limits)
 */
export function addItemsToSettlerInventory(
  settler: ISettler,
  itemId: string,
  requestedQuantity: number
): { added: number; reason?: string } {
  
  const catalogueItem = getItemFromCatalogue(itemId);
  if (!catalogueItem) {
    return { added: 0, reason: `Item ${itemId} not found in catalogue` };
  }
  
  const isStackable = catalogueItem.properties?.stackable === true;
  const existingItem = settler.carry.find(item => item.itemId === itemId);
  
  if (!isStackable && existingItem) {
    return { added: 0, reason: `Item ${itemId} is not stackable and already carried` };
  }
  
  // For stackable items, try to add all at once if possible
  // For non-stackable items, can only add 1 if no existing item
  if (isStackable && existingItem) {
    // Adding to existing stack - check weight constraint
    const canCarryResult = canCarryItems(settler, itemId, requestedQuantity);
    
    if (canCarryResult.canCarry) {
      existingItem.quantity += requestedQuantity;
      return { added: requestedQuantity };
    } else {
      // Try to add as many as possible within weight limit
      let quantityAdded = 0;
      for (let i = 1; i <= requestedQuantity; i++) {
        const canCarryCheck = canCarryItems(settler, itemId, i);
        if (canCarryCheck.canCarry) {
          quantityAdded = i;
        } else {
          break;
        }
      }
      
      if (quantityAdded > 0) {
        existingItem.quantity += quantityAdded;
        return { added: quantityAdded };
      } else {
        return { added: 0, reason: 'Weight limit exceeded' };
      }
    }
  } else {
    // New item or non-stackable item
    const canCarryResult = canCarryItems(settler, itemId, requestedQuantity);
    
    if (canCarryResult.canCarry) {
      settler.carry.push({ itemId, quantity: requestedQuantity });
      return { added: requestedQuantity };
    } else {
      // For stackable new items, try to add as many as possible
      if (isStackable) {
        let quantityAdded = 0;
        for (let i = 1; i <= requestedQuantity; i++) {
          const canCarryCheck = canCarryItems(settler, itemId, i);
          if (canCarryCheck.canCarry) {
            quantityAdded = i;
          } else {
            break;
          }
        }
        
        if (quantityAdded > 0) {
          settler.carry.push({ itemId, quantity: quantityAdded });
          return { added: quantityAdded };
        }
      }
      
      return { added: 0, reason: canCarryResult.reason };
    }
  }
}

/**
 * Handle reward distribution for a settler returning from a task
 * First tries to add items to settler inventory, then adds overflow to colony inventory
 */
export async function distributeRewardsToSettlerAndColony(
  settler: SettlerDoc,
  colonyId: string,
  rewards: Record<string, number>,
  session: ClientSession
): Promise<{ settlerItems: Record<string, number>; colonyItems: Record<string, number> }> {
  
  const settlerItems: Record<string, number> = {};
  const colonyItems: Record<string, number> = {};
  
  for (const [itemId, quantity] of Object.entries(rewards)) {
    if (quantity <= 0) continue;
    
    // Try to add items to settler first
    const result = addItemsToSettlerInventory(settler, itemId, quantity);
    
    if (result.added > 0) {
      settlerItems[itemId] = result.added;
    }
    
    // Add overflow to colony inventory
    const overflow = quantity - result.added;
    if (overflow > 0) {
      colonyItems[itemId] = overflow;
    }
  }
  
  // Save settler changes
  await settler.save({ session });
  
  // Add overflow items to colony inventory
  if (Object.keys(colonyItems).length > 0) {
    await addRewardsToColonyInventory(colonyId, session, colonyItems);
  }
  
  return { settlerItems, colonyItems };
}