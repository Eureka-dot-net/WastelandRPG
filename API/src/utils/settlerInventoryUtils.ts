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
 * Transfer all items from settler's inventory to colony inventory
 * This represents a settler returning from exploration/tasks and depositing their finds
 * Could be made into a user-controlled action in the future
 */
export async function transferSettlerItemsToColony(
  settler: SettlerDoc,
  colonyId: string,
  session: ClientSession
): Promise<{ transferredItems: Record<string, number> }> {
  
  const transferredItems: Record<string, number> = {};
  
  // Convert settler's carry items to the format expected by colony inventory
  for (const carriedItem of settler.carry) {
    if (carriedItem.quantity > 0) {
      transferredItems[carriedItem.itemId] = carriedItem.quantity;
    }
  }
  
  // Clear settler's inventory
  settler.carry = [];
  
  // Save settler changes
  await settler.save({ session });
  
  // Add all items to colony inventory
  if (Object.keys(transferredItems).length > 0) {
    await addRewardsToColonyInventory(colonyId, session, transferredItems);
  }
  
  return { transferredItems };
}

/**
 * Add rewards directly to settler inventory (for when they find items during exploration)
 * This is used during the exploration/task to give items to the settler
 */
export async function giveRewardsToSettler(
  settler: SettlerDoc,
  rewards: Record<string, number>,
  session: ClientSession
): Promise<{ settlerItems: Record<string, number>; overflow: Record<string, number> }> {
  
  const settlerItems: Record<string, number> = {};
  const overflow: Record<string, number> = {};
  
  for (const [itemId, quantity] of Object.entries(rewards)) {
    if (quantity <= 0) continue;
    
    // Try to add items to settler
    const result = addItemsToSettlerInventory(settler, itemId, quantity);
    
    if (result.added > 0) {
      settlerItems[itemId] = result.added;
    }
    
    // Track overflow (items that couldn't fit)
    const overflow_qty = quantity - result.added;
    if (overflow_qty > 0) {
      overflow[itemId] = overflow_qty;
    }
  }
  
  // Save settler changes
  await settler.save({ session });
  
  return { settlerItems, overflow };
}