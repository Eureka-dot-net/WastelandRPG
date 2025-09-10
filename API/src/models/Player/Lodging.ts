import { Schema, model, Types, HydratedDocument } from 'mongoose';

// Each bed in the lodging
export interface IBed {
  _id: Types.ObjectId; // Unique bed ID
  level: number;       // Bed level (e.g. quality or upgrade)
}

// Lodging model
export interface ILodging {
  colonyId: Types.ObjectId;
  maxBeds: number;      // Maximum number of beds (default: 3)
  beds: IBed[];
  name?: string;        // Optional name or label for the lodging
}

const BedSchema = new Schema<IBed>(
  {
    level: { type: Number, required: true },
  },
  { _id: true } // Each bed gets its own ObjectId
);

const LodgingSchema = new Schema(
  {
    colonyId: { type: Schema.Types.ObjectId, ref: 'Colony', required: true },
    maxBeds: { type: Number, required: true, default: 3 },
    beds: { type: [BedSchema], default: [] },
    name: { type: String, required: false },
  },
  { timestamps: true, versionKey: false },
);

export type LodgingDoc = HydratedDocument<ILodging>;
export const Lodging = model<LodgingDoc>('Lodging', LodgingSchema);