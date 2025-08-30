import { Schema, model, Types, Document, HydratedDocument } from 'mongoose';
import { Assignment } from './Assignment';
import { Inventory } from './Inventory';
import { SettlerDoc } from './Settler';

// 1️⃣ Interface describing the shape of your data
export interface IColony {
  userId: Types.ObjectId;
  serverId: string;
  colonyName: string;
  level: number;
  notoriety: number;
  inventorySize: number;
  settlers: SettlerDoc[];
  inventory?: Types.ObjectId;
  createdAt?: Date;
  logs: IColonyLog[];
}

interface IColonyLog {
  timestamp: Date;
  type: string; // e.g. "food", "combat", "construction", "general"
  message: string;
  meta?: Record<string, any>; // optional structured data
}

export interface IColonyMethods {
  getUnlocks(): Promise<Record<string, boolean>>;
  getResources(): Promise<{ daysFood: number; scrapMetal: number; wood: number }>;
  addLogEntry(type: string, message: string, meta?: Record<string, any>): Promise<void>;
}

// 2️⃣ Document type: combines interface + Mongoose document methods
export type ColonyDoc = HydratedDocument<IColony, IColonyMethods>;


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
  logs: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String, required: true },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} }
  }]
}, {
  // Optional: Add schema options for better functionality
  timestamps: true, // Automatically manages createdAt and updatedAt
  versionKey: false, // Removes __v field
});

// 4️⃣ Add indexes for better query performance
colonySchema.index({ userId: 1, serverId: 1 }); // Compound index for user-server queries
colonySchema.index({ serverId: 1 }); // Index for server-wide queries
colonySchema.index({ colonyName: 1 }); // Index for name searches

colonySchema.methods.getUnlocks = async function (): Promise<Record<string, boolean>> {
  const assignments = await Assignment.find({
    colonyId: this._id,
    type: "general",
    state: { $in: ['completed', 'informed'] }
  });

  const unlocks: Record<string, boolean> = {};
  for (const a of assignments) {
    if (a.unlocks) {
      if (Array.isArray(a.unlocks)) {
        for (const key of a.unlocks) unlocks[key] = true;
      } else {
        unlocks[a.unlocks] = true;
      }
    }
  }
  return unlocks;
};

colonySchema.methods.getResources = async function () {
  const [foodAgg, scrapDoc, woodDoc] = await Promise.all([
    Inventory.aggregate([
      { $match: { colonyId: this._id } },
      { $unwind: "$items" },
      { $match: { "items.type": "food" } },
      {
        $group: {
          _id: "$colonyId",
          totalFood: { $sum: { $multiply: ["$items.quantity", "$items.properties.foodValue"] } }
        }
      }
    ]),
    Inventory.findOne({ colonyId: this._id, "items.itemId": "scrap" }, { "items.$": 1 }).lean(),
    Inventory.findOne({ colonyId: this._id, "items.itemId": "wood" }, { "items.$": 1 }).lean()
  ]);

  const settlerCount = this.settlers?.length || 1;
  const daysFood = foodAgg.length > 0 ? Number((foodAgg[0].totalFood / settlerCount).toFixed(1)) : 0;

  return {
    daysFood,
    scrapMetal: scrapDoc?.items?.[0]?.quantity || 0,
    wood: woodDoc?.items?.[0]?.quantity || 0
  };
};

colonySchema.methods.addLogEntry = async function (type: string, message: string, meta?: Record<string, any>) {
  this.logs.push({ type, message, meta });
  if (this.logs.length > 50) {
    this.logs = this.logs.slice(-50); // keep only latest 50
  }
  await this.save();
};


// 5️⃣ Model: generic is **ColonyDoc**
export const Colony = model<ColonyDoc>('Colony', colonySchema);