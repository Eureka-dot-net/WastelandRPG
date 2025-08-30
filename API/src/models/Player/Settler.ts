import { Schema, model, Types, Document, HydratedDocument } from 'mongoose';

// Carrying items
export interface ISettlerItem {
  itemId: string;
  quantity: number;
}

export const settlerItemSchema = new Schema<ISettlerItem>({
  itemId: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
});

// Equipment schema
export interface IEquipment {
  weapon?: ISettlerItem;
  armor?: ISettlerItem;
  // Add more slots if needed
}

export const equipmentSchema = new Schema<IEquipment>({
  weapon: settlerItemSchema,
  armor: settlerItemSchema,
  // Add more slots
});

// Main Settler interface
export interface ISettler extends Document {
  colonyId: Types.ObjectId;
  isActive: boolean;
  nameId: string;
  name: string;
  backstory: string;
  theme?: string;

  stats: {
    strength: number;
    speed: number;
    intelligence: number;
    resilience: number;
  };

  skills: {
    combat: number;
    scavenging: number;
    farming: number;
    crafting: number;
    medical: number;
    engineering: number;
  };

  interests: string[];

  traitEffect: {
    target: string;
  }

  traits: {
    traitId: string;
    name: string;
    type: string;
    description: string;
    icon: string;
  }[];

  status: "idle" | "busy" | "resting";
  health: number;
  morale: number;
  hunger: number;
  energy: number;
  carry: ISettlerItem[];
  equipment: IEquipment;
  maxCarrySlots: number;
  createdAt: Date;
}

// Mongoose schema/model
export const settlerSchema = new Schema({
  colonyId: { type: Schema.Types.ObjectId, ref: 'Colony', required: true },
  nameId: { type: String, required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  backstory: { type: String, required: true },
  theme: { type: String },
  stats: {
    strength: { type: Number, required: true, min: 0, max: 20 },
    speed: { type: Number, required: true, min: 0, max: 20 },
    intelligence: { type: Number, required: true, min: 0, max: 20 },
    resilience: { type: Number, required: true, min: 0, max: 20 },
  },
  skills: {
    combat: { type: Number, required: true, min: 0, max: 20 },
    scavenging: { type: Number, required: true, min: 0, max: 20 },
    farming: { type: Number, required: true, min: 0, max: 20 },
    crafting: { type: Number, required: true, min: 0, max: 20 },
    medical: { type: Number, required: true, min: 0, max: 20 },
    engineering: { type: Number, required: true, min: 0, max: 20 },
  },
  interests: [{ type: String }],
  traits: [
    {
      traitId: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true },
      description: { type: String, required: true },
      icon: { type: String, required: true },
    }
  ],
  status: { type: String, default: "idle" },
  health: { type: Number, default: 100 },
  morale: { type: Number, default: 90 },
  hunger: { type: Number, default: 0 },
  energy: { type: Number, default: 100 },
  carry: [settlerItemSchema],
  equipment: equipmentSchema,
  maxCarrySlots: { type: Number, default: 8 },
  createdAt: { type: Date, default: Date.now },
});

export type SettlerDoc = HydratedDocument<ISettler>;

export const Settler = model<SettlerDoc>('Settler', settlerSchema);