import { Schema, model, Types, HydratedDocument } from 'mongoose';
import {  MapTileDoc } from '../Server/MapTile';

// --- User-specific tile interface ---
export interface IUserMapTile {
  serverTile: Types.ObjectId | MapTileDoc; // reference to the master tile
  x: number;                               // redundant copy of tile coords for easy querying
  y: number;                               // redundant copy of tile coords for easy querying
  terrain: string;                        // redundant copy of terrain type in case master tile changes. Need to reexplore to get updates
  icon: string;                           // icon representing the tile
  colonyId: string;                        // which colony discovered it
  exploredAt: Date;
  isExplored: boolean;                     // false when exploration starts, true when completed
  distanceFromHomestead: number;           // distance from colony's homestead
  explorationTime: number;                 // time required to explore this tile (ms)
  lootMultiplier: number;                  // loot multiplier based on distance
}

const UserMapTileSchema = new Schema({
  serverTile: { type: Schema.Types.ObjectId, ref: 'MapTile', required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  terrain: { type: String, required: true },
  icon: {type: String, required: true },
  colonyId: { type: String, required: true },
  exploredAt: { type: Date, default: Date.now },
  isExplored: { type: Boolean, default: false },
  distanceFromHomestead: { type: Number, required: true },
  explorationTime: { type: Number, required: true },
  lootMultiplier: { type: Number, required: true }
});

// Ensure one tile per colony
UserMapTileSchema.index({ serverTile: 1, colonyId: 1 }, { unique: true });
UserMapTileSchema.index({ colonyId: 1, x: 1, y: 1 });

// --- Model ---
export type UserMapTileDoc = HydratedDocument<IUserMapTile>;
export const UserMapTile = model<UserMapTileDoc>('UserMapTile', UserMapTileSchema);
