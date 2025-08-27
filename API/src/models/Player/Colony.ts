import { Schema, model, Types } from 'mongoose';

export interface IColony {
  userId: Types.ObjectId;
  serverId: string;
  colonyName: string;
  level: number;         // Progression level
  notoriety: number;     // Infamy, 0-100
  settlers: Types.ObjectId[];  // references to Settler model
  inventory: Types.ObjectId;   // reference to Inventory model
  createdAt?: Date;
}

const colonySchema = new Schema<IColony>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  serverId: { type: String, required: true },
  colonyName: { type: String, required: true },
  level: { type: Number, default: 1 },
  notoriety: { type: Number, default: 0, min: 0, max: 100 },
  settlers: [{ type: Schema.Types.ObjectId, ref: 'Settler' }],
  inventory: { type: Schema.Types.ObjectId, ref: 'Inventory' },
  createdAt: { type: Date, default: Date.now },
});

export const Colony = model<IColony>('Colony', colonySchema);