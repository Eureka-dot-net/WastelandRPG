import { Schema, model, Types, Document, HydratedDocument } from 'mongoose';

// 1️⃣ Interface describing the shape of your data
export interface IColony {
  userId: Types.ObjectId;
  serverId: string;
  colonyName: string;
  level: number;
  notoriety: number;
  inventorySize: number;
  settlers: Types.ObjectId[];
  inventory?: Types.ObjectId;
  createdAt?: Date;
}

// 2️⃣ Document type: combines interface + Mongoose document methods
export type ColonyDoc = HydratedDocument<IColony>;

// 3️⃣ Schema: no generic type specified
const colonySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  serverId: { type: String, required: true },
  colonyName: { type: String, required: true },
  level: { type: Number, default: 1, min: 1 }, // Added min constraint for level
  notoriety: { type: Number, default: 0, min: 0, max: 100 },
  inventorySize: { type: Number, default: 50, min: 0 },
  settlers: [{ type: Schema.Types.ObjectId, ref: 'Settler' }],
  inventory: { type: Schema.Types.ObjectId, ref: 'Inventory' }, // Not required
}, {
  // Optional: Add schema options for better functionality
  timestamps: true, // Automatically manages createdAt and updatedAt
  versionKey: false, // Removes __v field
});

// 4️⃣ Add indexes for better query performance
colonySchema.index({ userId: 1, serverId: 1 }); // Compound index for user-server queries
colonySchema.index({ serverId: 1 }); // Index for server-wide queries
colonySchema.index({ colonyName: 1 }); // Index for name searches

// 5️⃣ Model: generic is **ColonyDoc**
export const Colony = model<ColonyDoc>('Colony', colonySchema);