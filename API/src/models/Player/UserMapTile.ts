import { Schema, model, Types, HydratedDocument } from 'mongoose';
import { ILootInfo, IThreatInfo, IEventInfo, MapTileDoc } from '../Server/MapTile';

// --- User-specific tile interface ---
export interface IUserMapTile {
  serverTile: Types.ObjectId | MapTileDoc; // reference to the master tile
  colonyId: string;                        // which colony discovered it
  exploredAt: Date;
  discoveredLoot?: ILootInfo[];            // optional, can store what was taken/found
  discoveredThreat?: IThreatInfo | null;   // optional, track threat changes if needed
}

const UserMapTileSchema = new Schema({
  serverTile: { type: Schema.Types.ObjectId, ref: 'MapTile', required: true },
  colonyId: { type: String, required: true },
  exploredAt: { type: Date, default: Date.now },
  discoveredLoot: { type: [Schema.Types.Mixed], default: [] }, // can reuse ILootInfo
  discoveredThreat: { type: Schema.Types.Mixed, default: null }
});

// Ensure one tile per colony
UserMapTileSchema.index({ serverTile: 1, colonyId: 1 }, { unique: true });

// --- Model ---
export type UserMapTileDoc = HydratedDocument<IUserMapTile>;
export const UserMapTile = model<UserMapTileDoc>('UserMapTile', UserMapTileSchema);
