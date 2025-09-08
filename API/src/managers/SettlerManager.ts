import type { SettlerDoc } from '../models/Player/Settler';
import itemsCatalogue from '../data/itemsCatalogue.json';
import traitsCatalogue from '../data/traitsCatalogue.json';
import statusCatalogue from '../data/statusCatalogue.json';
import { addRewardsToColonyInventory } from '../services/gameEventsService';
import { ClientSession } from 'mongoose';

export class SettlerManager {
  private settler: SettlerDoc;

  constructor(settler: SettlerDoc) {
    this.settler = settler;
  }

  // Computed: speed after all modifiers
  get speedModifier() {
    let modifier = 1;

    // Example: hunger reduces speed
    if (this.settler.hunger >= 50) modifier *= 0.5;

    if (this.settler.hunger >= 100) modifier *= 0.25;

    // Example: traits
    if (this.settler.traits?.some(t => t.traitId === 'energetic')) modifier *= 1.2;

    // TODO: add morale, equipment, etc.
    return modifier;
  }

  get effectiveSpeed() {
    return this.settler.stats.speed * this.speedModifier;
  }

  // Computed: daily food consumption multiplier
  get foodSatiationRate() {
    let multiplier = 1;

    //TODO: implement trait-based adjustments from catalogue
    // Example: gluttonous trait
    if (this.settler.traits?.some(t => t.traitId === 'gluttonous')) multiplier -= 0.5;

    // Example: a positive trait that reduces consumption
    if (this.settler.traits?.some(t => t.traitId === 'lightEater')) multiplier += 0.5;

    return multiplier;
  }

  // Computed: maximum carrying capacity based on strength
  get carryingCapacity(): number {
    // strength * 5 = capacity
    // strength 2 -> 10, strength 10 -> 50, strength 20 -> 100
    return Math.max(10, this.settler.stats.strength * 5);
  }

  // Computed: current weight being carried
  get currentCarriedWeight(): number {
    let totalWeight = 0;
    
    for (const carriedItem of this.settler.carry) {
      const catalogueItem = this.getItemFromCatalogue(carriedItem.itemId);
      if (catalogueItem && catalogueItem.properties?.weight) {
        // For stackable items, multiply weight by quantity
        const itemWeight = catalogueItem.properties.weight as number;
        totalWeight += itemWeight * carriedItem.quantity;
      }
    }
    
    return totalWeight;
  }

  /**
   * Parse a modifier string like "+20%", "-3", "+10% yield" into a numeric value
   */
  private parseModifier(modifier: string): { value: number; isPercentage: boolean } {
    const cleanModifier = modifier.trim();
    const isPercentage = cleanModifier.includes('%');
    const numericPart = cleanModifier.replace(/[^-+0-9.]/g, '');
    const value = parseFloat(numericPart) || 0;
    
    return { value, isPercentage };
  }

  /**
   * Calculate time multiplier for a given activity type based on settler stats, traits, and skills
   * Lower values mean faster completion times
   */
  adjustedTimeMultiplier(activityType?: string): number {
    let timeMultiplier = 1.0;
    
    // Speed stat effect (0-20 scale, normalized to 0.5-1.5x)
    // Higher speed = lower time multiplier (faster)
    const speedMultiplier = 2.0 - (0.5 + (this.settler.stats.speed / 20) * 1.0);
    timeMultiplier *= speedMultiplier;

    // Apply trait effects
    if (this.settler.traits && Array.isArray(this.settler.traits)) {
      for (const settlerTrait of this.settler.traits) {
        const traitData = traitsCatalogue.find(t => t.traitId === settlerTrait.traitId);
        if (!traitData?.effects) continue;

        for (const effect of traitData.effects) {
          // Check if this effect applies to tasks/activities
          if (effect.target === 'task') {
            // Check if it applies to all tasks or specific activity type
            const appliesToActivity = 
              effect.key === 'all' || 
              (activityType && effect.key.split(',').includes(activityType));
            
            if (appliesToActivity) {
              const { value, isPercentage } = this.parseModifier(effect.modifier);
              
              if (isPercentage) {
                // For time effects, positive percentage = longer time, negative = shorter time
                timeMultiplier *= (1 + value / 100);
              }
              // Non-percentage modifiers for time don't make sense, skip them
            }
          }
        }
      }
    }

    return Math.max(0.1, timeMultiplier); // Ensure positive multiplier
  }

  /**
   * Calculate loot multiplier for a given activity type based on settler stats, traits, and skills  
   * Higher values mean better loot yields
   */
  adjustedLootMultiplier(activityType?: string): number {
    let lootMultiplier = 1.0;

    // Scavenging skill effect (0-20 scale, normalized to 0.8-1.4x multiplier)
    const scavengingMultiplier = 0.8 + (this.settler.skills.scavenging / 20) * 0.6;
    lootMultiplier *= scavengingMultiplier;

    // Intelligence affects loot quality/variety (0-20 scale, normalized to 0.9-1.2x)
    const intelligenceMultiplier = 0.9 + (this.settler.stats.intelligence / 20) * 0.3;
    lootMultiplier *= intelligenceMultiplier;

    // Apply trait effects
    if (this.settler.traits && Array.isArray(this.settler.traits)) {
      for (const settlerTrait of this.settler.traits) {
        const traitData = traitsCatalogue.find(t => t.traitId === settlerTrait.traitId);
        if (!traitData?.effects) continue;

        for (const effect of traitData.effects) {
          // Check if this effect applies to tasks/activities and mentions yield/loot
          if (effect.target === 'task' && (effect.modifier.includes('yield') || effect.modifier.includes('loot'))) {
            // Check if it applies to all tasks or specific activity type
            const appliesToActivity = 
              effect.key === 'all' || 
              (activityType && effect.key.split(',').includes(activityType));
            
            if (appliesToActivity) {
              const { value, isPercentage } = this.parseModifier(effect.modifier);
              
              if (isPercentage) {
                // For loot effects, positive percentage = more loot, negative = less loot
                lootMultiplier *= (1 + value / 100);
              }
              // Non-percentage modifiers for loot don't make sense, skip them
            }
          }
        }
      }
    }

    return Math.max(0.1, lootMultiplier); // Ensure positive multiplier
  }

  /**
   * Get item details from the catalogue
   */
  private getItemFromCatalogue(itemId: string) {
    return itemsCatalogue.find(item => item.itemId === itemId);
  }

  /**
   * Check if settler can carry additional items without exceeding limits
   */
  canCarryItems(
    itemId: string, 
    quantity: number = 1
  ): { canCarry: boolean; reason?: string; details: { currentSlots: number; maxSlots: number; currentWeight: number; maxWeight: number; itemWeight: number } } {
    
    const catalogueItem = this.getItemFromCatalogue(itemId);
    if (!catalogueItem) {
      return {
        canCarry: false,
        reason: `Item ${itemId} not found in catalogue`,
        details: { currentSlots: 0, maxSlots: 0, currentWeight: 0, maxWeight: 0, itemWeight: 0 }
      };
    }

    const itemWeight = (catalogueItem.properties?.weight as number) || 1;
    const maxWeight = this.carryingCapacity;
    const currentWeight = this.currentCarriedWeight;
    const maxSlots = this.settler.maxCarrySlots;
    
    // Check if item is already being carried (for stackable items)
    const existingItem = this.settler.carry.find(item => item.itemId === itemId);
    const isStackable = catalogueItem.properties?.stackable === true;
    
    let currentSlots = this.settler.carry.length;
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
  addItems(
    itemId: string,
    requestedQuantity: number
  ): { added: number; reason?: string } {
    
    const catalogueItem = this.getItemFromCatalogue(itemId);
    if (!catalogueItem) {
      return { added: 0, reason: `Item ${itemId} not found in catalogue` };
    }
    
    const isStackable = catalogueItem.properties?.stackable === true;
    const existingItem = this.settler.carry.find(item => item.itemId === itemId);
    
    if (!isStackable && existingItem) {
      return { added: 0, reason: `Item ${itemId} is not stackable and already carried` };
    }
    
    // For stackable items, try to add all at once if possible
    // For non-stackable items, can only add 1 if no existing item
    if (isStackable && existingItem) {
      // Adding to existing stack - check weight constraint
      const canCarryResult = this.canCarryItems(itemId, requestedQuantity);
      
      if (canCarryResult.canCarry) {
        existingItem.quantity += requestedQuantity;
        return { added: requestedQuantity };
      } else {
        // Try to add as many as possible within weight limit
        let quantityAdded = 0;
        for (let i = 1; i <= requestedQuantity; i++) {
          const canCarryCheck = this.canCarryItems(itemId, i);
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
      const canCarryResult = this.canCarryItems(itemId, requestedQuantity);
      
      if (canCarryResult.canCarry) {
        this.settler.carry.push({ itemId, quantity: requestedQuantity });
        return { added: requestedQuantity };
      } else {
        // For stackable new items, try to add as many as possible
        if (isStackable) {
          let quantityAdded = 0;
          for (let i = 1; i <= requestedQuantity; i++) {
            const canCarryCheck = this.canCarryItems(itemId, i);
            if (canCarryCheck.canCarry) {
              quantityAdded = i;
            } else {
              break;
            }
          }
          
          if (quantityAdded > 0) {
            this.settler.carry.push({ itemId, quantity: quantityAdded });
            return { added: quantityAdded };
          }
        }
        
        return { added: 0, reason: canCarryResult.reason };
      }
    }
  }

  /**
   * Transfer items from settler's inventory to colony inventory
   * Respects colony inventory slot limits - only new item types are blocked
   * Items that cannot fit remain in the settler's inventory
   * This represents a settler returning from exploration/tasks and depositing their finds
   * Could be made into a user-controlled action in the future
   */
  async transferItemsToColony(
    colonyId: string,
    session: ClientSession
  ): Promise<{ transferredItems: Record<string, number>; remainingItems: Record<string, number> }> {
    
    const { Inventory } = await import('../models/Player/Inventory');
    const { Colony } = await import('../models/Player/Colony');
    
    // Get colony to check inventory limits
    const colony = await Colony.findById(colonyId).session(session);
    if (!colony) {
      throw new Error(`Colony ${colonyId} not found`);
    }
    
    // Get current colony inventory
    let inventory = await Inventory.findOne({ colonyId }).session(session);
    
    // If no inventory exists, create one
    if (!inventory) {
      inventory = new Inventory({
        colonyId,
        items: [],
      });
    }
    
    const transferredItems: Record<string, number> = {};
    const remainingItems: Record<string, number> = {};
    const maxSlots = colony.maxInventory;
    const currentUniqueItems = inventory.items.length;
    
    // Process each carried item
    for (const carriedItem of this.settler.carry) {
      if (carriedItem.quantity <= 0) continue;
      
      const itemId = carriedItem.itemId;
      const quantity = carriedItem.quantity;
      
      // Check if colony already has this item type
      const existingColonyItem = inventory.items.find(item => item.itemId === itemId);
      
      if (existingColonyItem) {
        // Colony already has this item type - can always add more quantity
        transferredItems[itemId] = quantity;
      } else {
        // New item type - check if colony has available slots
        const newItemsBeingAdded = Object.keys(transferredItems).filter(id => 
          !inventory.items.find(item => item.itemId === id)
        ).length;
        
        if (currentUniqueItems + newItemsBeingAdded < maxSlots) {
          // Colony has space for this new item type
          transferredItems[itemId] = quantity;
        } else {
          // Colony is full - item stays with settler
          remainingItems[itemId] = quantity;
        }
      }
    }
    
    // Update settler's carry inventory - remove transferred items, keep remaining ones
    this.settler.carry = this.settler.carry.filter(carriedItem => {
      const itemId = carriedItem.itemId;
      return remainingItems.hasOwnProperty(itemId);
    });
    
    // Save settler changes
    await this.settler.save({ session });
    
    // Add transferred items to colony inventory
    if (Object.keys(transferredItems).length > 0) {
      await addRewardsToColonyInventory(colonyId, session, transferredItems);
    }
    
    return { transferredItems, remainingItems };
  }

  /**
   * Add rewards directly to settler inventory (for when they find items during exploration)
   * This is used during the exploration/task to give items to the settler
   * Logs overflow items to colony logs when items cannot fit in settler's inventory
   */
  async giveRewards(
    rewards: Record<string, number>,
    colonyId: string,
    session: ClientSession
  ): Promise<{ settlerItems: Record<string, number>; overflow: Record<string, number> }> {
    
    const settlerItems: Record<string, number> = {};
    const overflow: Record<string, number> = {};
    
    for (const [itemId, quantity] of Object.entries(rewards)) {
      if (quantity <= 0) continue;
      
      // Try to add items to settler
      const result = this.addItems(itemId, quantity);
      
      if (result.added > 0) {
        settlerItems[itemId] = result.added;
      }
      
      // Track overflow (items that couldn't fit)
      const overflow_qty = quantity - result.added;
      if (overflow_qty > 0) {
        overflow[itemId] = overflow_qty;
      }
    }
    
    // Log overflow items to colony
    if (Object.keys(overflow).length > 0) {
      const { Colony } = await import('../models/Player/Colony');
      const { ColonyManager } = await import('./ColonyManager');
      
      const colony = await Colony.findById(colonyId).session(session);
      if (colony) {
        const colonyManager = new ColonyManager(colony);
        
        const overflowList = Object.entries(overflow)
          .map(([itemId, qty]) => `${qty}x ${itemId}`)
          .join(', ');
          
        await colonyManager.addLogEntry(
          session,
          'inventory_overflow',
          `${this.settler.name} found items but their inventory was full. Lost items: ${overflowList}`,
          { settlerId: this.settler._id.toString(), overflow }
        );
      }
    }
    
    // Save settler changes
    await this.settler.save({ session });
    
    return { settlerItems, overflow };
  }

  /**
   * Drop entire item stack from settler's inventory
   * Returns the dropped items for confirmation
   */
  async dropItems(
    itemId: string,
    session: ClientSession
  ): Promise<{ droppedItems: Record<string, number>; success: boolean; message: string }> {
    
    const itemIndex = this.settler.carry.findIndex(item => item.itemId === itemId);
    
    if (itemIndex === -1) {
      return {
        droppedItems: {},
        success: false,
        message: `Settler doesn't have item: ${itemId}`
      };
    }
    
    const droppedItem = this.settler.carry[itemIndex];
    const droppedQuantity = droppedItem.quantity;
    
    // Remove item from settler's inventory
    this.settler.carry.splice(itemIndex, 1);
    
    // Save settler changes
    await this.settler.save({ session });
    
    return {
      droppedItems: { [itemId]: droppedQuantity },
      success: true,
      message: `Dropped ${droppedQuantity} ${itemId} from settler inventory`
    };
  }

  /**
   * Get the energy delta per hour for a specific status from the status catalogue
   * @param status - The settler status to get energy delta for
   * @returns Energy change per hour for the given status
   */
  getEnergyDeltaForStatus(status: string): number {
    const statusEntry = statusCatalogue.find(s => s.statusId === status);
    return statusEntry?.energyDeltaPerHour || 0;
  }

  /**
   * Calculate and update settler's current energy based on time passed since last update
   * This should be called before any status changes to ensure energy is up to date
   * @returns The updated energy value
   */
  updateEnergy(): number {
    const now = new Date();
    const lastUpdated = this.settler.energyLastUpdated || this.settler.createdAt || now;
    
    // Calculate hours passed since last energy update
    const hoursPassed = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    if (hoursPassed > 0) {
      // Get energy delta for current status
      const energyDelta = this.getEnergyDeltaForStatus(this.settler.status);
      
      // Calculate energy change
      const energyChange = energyDelta * hoursPassed;
      
      // Update energy (clamped between 0 and 100)
      this.settler.energy = Math.max(0, Math.min(100, this.settler.energy + energyChange));
      
      // Update the last updated timestamp
      this.settler.energyLastUpdated = now;
    }
    
    return this.settler.energy;
  }

  /**
   * Change settler status with proper energy calculation
   * This should be used instead of directly setting settler.status
   * @param newStatus - The new status to set
   * @param session - MongoDB session for transaction
   */
  async changeStatus(newStatus: string, session: ClientSession): Promise<void> {
    // First update energy based on time in current status
    this.updateEnergy();
    
    // Change the status
    this.settler.status = newStatus as any;
    
    // Save the changes
    await this.settler.save({ session });
  }

  /**
   * Check if settler has enough energy to complete a task of given duration
   * @param status - The status/activity type for the task
   * @param durationHours - Duration of the task in hours
   * @returns Whether the settler can complete the task
   */
  canCompleteTask(status: string, durationHours: number): boolean {
    // First ensure energy is up to date
    this.updateEnergy();
    
    // Calculate energy that will be consumed during the task
    const energyDelta = this.getEnergyDeltaForStatus(status);
    const energyRequired = Math.abs(energyDelta * durationHours);
    
    // For energy-consuming tasks (negative delta), check if we have enough energy
    if (energyDelta < 0) {
      return this.settler.energy >= energyRequired;
    }
    
    // For energy-gaining tasks (positive delta), always allow
    return true;
  }

  toViewModel() {//return the full object to use in controllers.
    return {
      ...this.settler.toObject(), 
      stats: {
        ...this.settler.stats,
        speed: this.effectiveSpeed
      },
      foodSatiationRate: this.foodSatiationRate,
      carryingCapacity: this.carryingCapacity,
      currentCarriedWeight: this.currentCarriedWeight
    };
  }

  // Other computed values can go here
}
