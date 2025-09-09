import { ClientSession, FilterQuery } from 'mongoose';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';
import type { ColonyDoc } from '../models/Player/Colony';
import { Inventory } from '../models/Player/Inventory';
import { SettlerManager } from './SettlerManager';
import itemsCatalogue from '../data/itemsCatalogue.json';
import { AssignmentManager } from './AssignmentManager';

export class ColonyManager {
  constructor(private colony: ColonyDoc) { }

  get id(): string {
    return this.colony._id.toString();
  }

  get homesteadLocation() {
    return this.colony.homesteadLocation;
  }

  get serverId() {
    return this.colony.serverId;
  }

  async getUnlocks() {
    const assignments = await Assignment.find({
      colonyId: this.colony._id,
      type: 'quest',
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
    const [foodAgg, scrapDoc, woodDoc, currentInventoryStacks] = await Promise.all([
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
      Inventory.aggregate([
        { $match: { colonyId: this.colony._id } },
        { $project: { currentInventoryStacks: { $size: { $ifNull: ["$items", []] } } } }
      ])
    ]);

    const settlerCount = this.colony.settlers?.length || 0;
    const daysFood = foodAgg.length > 0 ? Number((foodAgg[0].totalFood / settlerCount).toFixed(1)) : 0;

    return {
      daysFood,
      scrapMetal: scrapDoc?.items?.[0]?.quantity || 0,
      wood: woodDoc?.items?.[0]?.quantity || 0,
      currentInventoryStacks: currentInventoryStacks[0]?.currentInventoryStacks || 0
    };
  }

  async addLogEntry(session: ClientSession, type: string, message: string, meta?: Record<string, any>) {
    this.colony.logs.push({ type, message, meta, timestamp: new Date() });
    if (this.colony.logs.length > 50) {
      this.colony.logs = this.colony.logs.slice(-50);
    }
    await this.colony.save({ session });
  }

  getNumberOfSettlers() {
    return this.colony.settlers?.length || 0;
  }

  canFindSettlerOrPrisoner() {
    const currentSettlers = this.getNumberOfSettlers();
    return currentSettlers < this.colony.maxSettlers;
  }

  getSettlerDetails() {
    const settlers = this.colony.settlers.map((s: any) => {
      const manager = new SettlerManager(s);
      return manager.toViewModel();
    });
    return settlers;
  }

  async addRewardsToColonyInventory(
    session: ClientSession,
    rewards: Record<string, number>
  ): Promise<{ transferred: Record<string, number>; remaining: Record<string, number> }> {
    if (!this.colony._id) {
      throw new Error("Colony ID is required");
    }

    // Get or create inventory
    let inventory = await Inventory.findOne({ colonyId: this.colony._id }).session(session);
    if (!inventory) {
      inventory = new Inventory({
        colonyId: this.colony._id,
        items: [],
      });
    }

    // Create a map for faster item lookups
    const inventoryMap = new Map(
      inventory.items.map(item => [item.itemId, item])
    );

    const transferred: Record<string, number> = {};
    const remaining: Record<string, number> = {};
    let availableSlots = this.colony.maxInventory - inventory.items.length;

    for (const [itemId, qty] of Object.entries(rewards)) {
      if (qty <= 0) continue;

      const catalogueItem = itemsCatalogue.find(item => item.itemId === itemId);
      if (!catalogueItem) {
        console.warn(`Item ${itemId} not found in catalogue, skipping`);
        remaining[itemId] = qty;
        continue;
      }

      const existingItem = inventoryMap.get(itemId);

      if (existingItem) {
        // Item exists - can always add to existing stack
        existingItem.quantity += qty;
        transferred[itemId] = qty;
      } else if (availableSlots > 0) {
        // New item and we have space
        const newItem = {
          itemId,
          name: catalogueItem.name,
          icon: catalogueItem.icon,
          quantity: qty,
          type: catalogueItem.type,
          properties: catalogueItem.properties || {},
        };

        inventory.items.push(newItem);
        inventoryMap.set(itemId, newItem); // Keep map in sync
        transferred[itemId] = qty;
        availableSlots--;
      } else {
        // No space for new item - it remains with the settler
        remaining[itemId] = qty;
      }
    }

    // Only save if we transferred any items
    if (Object.keys(transferred).length > 0) {
      await inventory.save({ session });
    }

    return { transferred, remaining };
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

  async completeAssignmentsForColony(
    session: ClientSession,
    now: Date = new Date()
  ) {
    const query: FilterQuery<AssignmentDoc> = {
      colonyId: this.colony.id,
      state: 'in-progress',
      completedAt: { $lte: now }
    };

    const assignments = await Assignment.find(query).session(session);

    if (!assignments.length) return;

    const logEntries: string[] = [];

    for (const assignment of assignments) {
      const assignmentManager = new AssignmentManager(assignment, this);
      const result = await assignmentManager.completeAssignment(session);
      logEntries.push(result.logEntry);
    }

    // Save all assignments
    await Promise.all([
      ...assignments.map((e: any) => e.save({ session }))
    ]);

    // Add logs after saving to avoid partial state issues
    for (let i = 0; i < logEntries.length; i++) {
      const entry = logEntries[i];
      const event = assignments[i];
      const meta = event.settlerFoundId ? { settlerId: event.settlerFoundId } : undefined;
      await this.addLogEntry(session, event.type, entry, meta);
    }
  }


  // Add more methods as needed
}
