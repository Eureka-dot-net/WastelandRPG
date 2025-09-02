import { Schema, model, Types, HydratedDocument } from 'mongoose';

// --- Supporting Types ---
export interface ILootInfo {
  item: string;
  amount: number;
}

export interface IThreatInfo {
  type: string;
  level: number;
}

export interface IEventInfo {
  type: string;
  description: string;
}

// --- Main Tile Interface ---
export interface IMapTile {
  serverId: string; // required server ID
  x: number;
  y: number;
  terrain?: string;
  loot?: ILootInfo[];
  threat?: IThreatInfo | null;
  event?: IEventInfo | null;
  exploredBy: string[];
  exploredAt: Date;
  colony?: Types.ObjectId;
}

// --- Mongoose Schema ---
const LootInfoSchema = new Schema<ILootInfo>({
  item: { type: String, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const ThreatInfoSchema = new Schema<IThreatInfo>({
  type: { type: String, required: true },
  level: { type: Number, required: true }
}, { _id: false });

const EventInfoSchema = new Schema<IEventInfo>({
  type: { type: String, required: true },
  description: { type: String, required: true }
}, { _id: false });

const MapTileSchema = new Schema({
  serverId: { type: String, required: true }, // <-- Added
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  terrain: { type: String, required: false },
  loot: { type: [LootInfoSchema], required: false },
  threat: { type: ThreatInfoSchema, default: null },
  event: { type: EventInfoSchema, default: null },
  exploredBy: [{ type: String, required: true, default: [] }],
  exploredAt: { type: Date, required: false },
  colony: { type: Schema.Types.ObjectId, ref: 'Colony', required: false }
});

// Unique index for (serverId, x, y)
MapTileSchema.index({ serverId: 1, x: 1, y: 1 }, { unique: true });

// --- Model ---
export type MapTileDoc = HydratedDocument<IMapTile>;
export const MapTile= model<MapTileDoc>('MapTile', MapTileSchema);