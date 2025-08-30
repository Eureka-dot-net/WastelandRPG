import { Schema, model, Types, HydratedDocument } from 'mongoose';

// Basic item structure
interface IInventoryItem {
  itemId: string;        // unique string for item type (e.g. "wood", "scrap", "weapon.spear")
  name: string;          // display name
  quantity: number;      // count
  type: string;          // "base" | "crafted"
  properties?: any;      // optional: { damage: 10, durability: 50, ... }
  icon: string;
}

interface IInventory {
  colonyId: Types.ObjectId;
  items: IInventoryItem[];
}

export type InventoryDoc = HydratedDocument<IInventory>;

const inventoryItemSchema = new Schema<IInventoryItem>({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  type: { type: String, required: true, enum: ['base', 'crafted','currency', 'farming', 'food', 'medicine', 'quest'] },
  properties: { type: Schema.Types.Mixed },
});

const inventorySchema = new Schema({
  colonyId: { type: Schema.Types.ObjectId, ref: 'Colony', required: true, unique: true },
  items: [inventoryItemSchema],
});

export const Inventory = model<InventoryDoc>('Inventory', inventorySchema);