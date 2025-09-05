import { Schema, model, Types, HydratedDocument } from 'mongoose';
import { ILootInfo, IThreatInfo, MapTileDoc } from '../Server/MapTile';

// --- User-specific tile interface ---
export interface IUserMapTile {
  serverTile: Types.ObjectId | MapTileDoc; // reference to the master tile
  colonyId: string;                        // which colony discovered it
  exploredAt: Date;
  isExplored: boolean;                     // false when exploration starts, true when completed
  distanceFromHomestead: number;           // distance from colony's homestead
  explorationTime: number;                 // time required to explore this tile (ms)
  lootMultiplier: number;                  // loot multiplier based on distance
  discoveredLoot?: ILootInfo[];            // optional, can store what was taken/found
  discoveredThreat?: IThreatInfo | null;   // optional, track threat changes if needed
}

const UserMapTileSchema = new Schema({
  serverTile: { type: Schema.Types.ObjectId, ref: 'MapTile', required: true },
  colonyId: { type: String, required: true },
  exploredAt: { type: Date, default: Date.now },
  isExplored: { type: Boolean, default: false },
  distanceFromHomestead: { type: Number, required: true },
  explorationTime: { type: Number, required: true },
  lootMultiplier: { type: Number, required: true },
  discoveredLoot: { type: [Schema.Types.Mixed], default: [] }, // can reuse ILootInfo
  discoveredThreat: { type: Schema.Types.Mixed, default: null }
});

// Ensure one tile per colony
UserMapTileSchema.index({ serverTile: 1, colonyId: 1 }, { unique: true });

// --- Model ---
export type UserMapTileDoc = HydratedDocument<IUserMapTile>;
export const UserMapTile = model<UserMapTileDoc>('UserMapTile', UserMapTileSchema);
