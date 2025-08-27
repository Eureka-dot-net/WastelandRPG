import { Schema, model, Types } from 'mongoose';

// Basic item structure
interface IInventoryItem {
  itemId: string;        // unique string for item type (e.g. "wood", "scrap", "weapon.spear")
  name: string;          // display name
  quantity: number;      // count
  type: string;          // "base" | "crafted"
  properties?: any;      // optional: { damage: 10, durability: 50, ... }
}

interface IInventory {
  playerId: Types.ObjectId;
  items: IInventoryItem[];
}

const inventoryItemSchema = new Schema<IInventoryItem>({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  type: { type: String, required: true, enum: ['base', 'crafted'] },
  properties: { type: Schema.Types.Mixed },
});

const inventorySchema = new Schema<IInventory>({
  playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, unique: true },
  items: [inventoryItemSchema],
});

export const Inventory = model<IInventory>('Inventory', inventorySchema);