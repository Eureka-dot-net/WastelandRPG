import { Schema, model, Types, HydratedDocument } from 'mongoose';
import { SettlerDoc } from './Settler';

export interface IColony {
  userId: Types.ObjectId;
  serverId: string;
  serverName: string;
  serverType: string;
  colonyName: string;
  level: number;
  hasInitialSettlers: boolean;

  notoriety: number;
  inventorySize: number;
  settlers: SettlerDoc[];
  inventory?: Types.ObjectId;
  createdAt?: Date;
  logs: IColonyLog[];
  homesteadLocation: { x: number; y: number };
  // New fields for spiral system
  spiralLayer: number;
  spiralPosition: number;
  spiralDirection: number;
  spiralIndex: number;
}

interface IColonyLog {
  timestamp: Date;
  type: string;
  message: string;
  meta?: Record<string, any>;
}

export type ColonyDoc = HydratedDocument<IColony>;

const colonySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  serverId: { type: String, required: true },
  serverName: { type: String, required: true },
  serverType: { type: String, required: true },
  colonyName: { type: String, required: true },
  level: { type: Number, default: 1, min: 1 },
  notoriety: { type: Number, default: 0, min: 0, max: 100 },
  inventorySize: { type: Number, default: 50, min: 0 },
  settlers: [{ type: Schema.Types.ObjectId, ref: 'Settler' }],
  hasInitialSettlers: { type: Boolean, default: false },
  inventory: { type: Schema.Types.ObjectId, ref: 'Inventory' },

  logs: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String, required: true },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} }
  }],
  homesteadLocation: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 }
  },
  // New spiral system fields
  spiralLayer: { type: Number, required: true, default: 0 },
  spiralPosition: { type: Number, required: true, default: 0 },
  spiralDirection: { type: Number, required: true, default: 0 }, // 0=right, 1=down, 2=left, 3=up
  spiralIndex: { type: Number, required: true } // Sequential index for ordering
}, {
  timestamps: true,
  versionKey: false,
});

colonySchema.index({ userId: 1, serverId: 1 });
colonySchema.index({ serverId: 1 });
colonySchema.index({ colonyName: 1 });
// Critical index for race condition protection and spiral ordering
colonySchema.index({ serverId: 1, spiralIndex: 1 }, { unique: true });
// Index for finding latest colony efficiently
colonySchema.index({ serverId: 1, spiralIndex: -1 });

export const Colony = model<ColonyDoc>('Colony', colonySchema);