import { ClientSession } from 'mongoose';
import { Assignment } from '../models/Player/Assignment';
import type { ColonyDoc } from '../models/Player/Colony';
import { Inventory } from '../models/Player/Inventory';
import { SettlerManager } from './SettlerManager';

export class ColonyManager {
  constructor(private colony: ColonyDoc) {}

  async getUnlocks() {
    const assignments = await Assignment.find({
      colonyId: this.colony._id,
      type: 'general',
      state: { $in: ['completed', 'informed'] }
    });

    const unlocks: Record<string, boolean> = {};
    for (const a of assignments) {
      if (a.unlocks) {
        if (Array.isArray(a.unlocks)) {
          for (const key of a.unlocks) unlocks[key] = true;
        } else {
          unlocks[a.unlocks] = true;
        }
      }
    }
    return unlocks;
  }

  async getResources() {
    const [foodAgg, scrapDoc, woodDoc, inventoryDoc] = await Promise.all([
      Inventory.aggregate([
        { $match: { colonyId: this.colony._id } },
        { $unwind: "$items" },
        { $match: { "items.type": "food" } },
        {
          $group: {
            _id: "$colonyId",
            totalFood: { $sum: { $multiply: ["$items.quantity", "$items.properties.foodValue"] } }
          }
        }
      ]),
      Inventory.findOne({ colonyId: this.colony._id, "items.itemId": "scrap" }, { "items.$": 1 }).lean(),
      Inventory.findOne({ colonyId: this.colony._id, "items.itemId": "wood" }, { "items.$": 1 }).lean(),
      Inventory.findOne({ colonyId: this.colony._id }).lean()
    ]);

    const settlerCount = this.colony.settlers?.length || 0;
    const daysFood = foodAgg.length > 0 ? Number((foodAgg[0].totalFood / settlerCount).toFixed(1)) : 0;
    const currentInventoryStacks = inventoryDoc?.items?.length || 0;

    return {
      daysFood,
      scrapMetal: scrapDoc?.items?.[0]?.quantity || 0,
      wood: woodDoc?.items?.[0]?.quantity || 0,
      currentInventoryStacks
    };
  }

  async addLogEntry(session: ClientSession, type: string, message: string, meta?: Record<string, any>) {
    this.colony.logs.push({ type, message, meta, timestamp: new Date() });
    if (this.colony.logs.length > 50) {
      this.colony.logs = this.colony.logs.slice(-50);
    }
    await this.colony.save({ session });
  }

  getSettlerDetails() {
    const settlers = this.colony.settlers.map((s: any) => {
        const manager = new SettlerManager(s);
        return manager.toViewModel();
      });
      return settlers;
  }

  /**
   * Drop entire item stack from colony's inventory
   * Returns the dropped items for confirmation
   */
  async dropItems(
    itemId: string,
    session: ClientSession
  ): Promise<{ droppedItems: Record<string, number>; success: boolean; message: string }> {
    
    const inventory = await Inventory.findOne({ colonyId: this.colony._id }).session(session);
    
    if (!inventory) {
      return {
        droppedItems: {},
        success: false,
        message: `Colony inventory not found`
      };
    }
    
    const itemIndex = inventory.items.findIndex(item => item.itemId === itemId);
    
    if (itemIndex === -1) {
      return {
        droppedItems: {},
        success: false,
        message: `Colony doesn't have item: ${itemId}`
      };
    }
    
    const droppedItem = inventory.items[itemIndex];
    const droppedQuantity = droppedItem.quantity;
    
    // Remove item from colony's inventory
    inventory.items = inventory.items.filter(i => i.itemId !== itemId);
    
    // Save inventory changes
    await inventory.save({ session });
    
    return {
      droppedItems: { [itemId]: droppedQuantity },
      success: true,
      message: `Dropped ${droppedQuantity} ${itemId} from colony inventory`
    };
  }

  /**
   * Calculate how many new item stacks would be added to colony inventory
   * based on given rewards
   */
  async calculateExpectedNewItems(
    rewards: Record<string, any>,
    session?: ClientSession
  ): Promise<number> {
    if (!rewards || Object.keys(rewards).length === 0) {
      return 0;
    }

    // Get current colony inventory
    const inventory = await Inventory.findOne({ colonyId: this.colony._id }).session(session || null);
    
    if (!inventory) {
      // No inventory yet, so all rewards would be new items
      return Object.keys(rewards).length;
    }

    // Count how many reward items are not already in colony inventory
    const existingItemIds = new Set(inventory.items.map(item => item.itemId));
    const newItemsCount = Object.keys(rewards).filter(itemId => !existingItemIds.has(itemId)).length;

    return newItemsCount;
  }

  async toViewModel() {
     const unlocks = await this.getUnlocks();
    const resources = await this.getResources();
    return {
      ...this.colony.toObject(),
      settlerCount: this.colony.settlers?.length || 0,
      settlers: this.getSettlerDetails(),
      unlocks,
      ...resources
    };
  }

  // Add more methods as needed
}
