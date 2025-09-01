import { Schema, model, Types, HydratedDocument } from 'mongoose';

// --- Supporting Types ---
export interface LootInfo {
  item: string;
  amount: number;
}

export interface ThreatInfo {
  type: string;
  level: number;
}

export interface EventInfo {
  type: string;
  description: string;
}

// --- Main Tile Interface ---
export interface MapTile {
  serverId: string; // required server ID
  x: number;
  y: number;
  terrain: string;
  loot: LootInfo[];
  threat: ThreatInfo | null;
  event: EventInfo | null;
  exploredBy: string[];
  exploredAt: Date;
  colony?: Types.ObjectId;
}

// --- Mongoose Schema ---
const LootInfoSchema = new Schema<LootInfo>({
  item: { type: String, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const ThreatInfoSchema = new Schema<ThreatInfo>({
  type: { type: String, required: true },
  level: { type: Number, required: true }
}, { _id: false });

const EventInfoSchema = new Schema<EventInfo>({
  type: { type: String, required: true },
  description: { type: String, required: true }
}, { _id: false });

const MapTileSchema = new Schema({
  serverId: { type: String, required: true }, // <-- Added
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  terrain: { type: String, required: true },
  loot: [LootInfoSchema],
  threat: { type: ThreatInfoSchema, default: null },
  event: { type: EventInfoSchema, default: null },
  exploredBy: [{ type: String, required: true }],
  exploredAt: { type: Date, required: true },
  colony: { type: Schema.Types.ObjectId, ref: 'Colony', required: false }
});

// Unique index for (serverId, x, y)
MapTileSchema.index({ serverId: 1, x: 1, y: 1 }, { unique: true });

// --- Model ---
export type MapTileDoc = HydratedDocument<MapTile>;
export const MapTileModel = model<MapTileDoc>('MapTile', MapTileSchema);