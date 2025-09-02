// models/assignment.model.ts
import { Schema, model, Types, HydratedDocument } from 'mongoose';

export type AssignmentType =
  | 'general'
  | 'farming'
  | 'exploration'
  | 'crafting'
  | 'defence'
  | 'building';

export interface IAssignment {
  colonyId: Types.ObjectId;
  taskId: string; // from TaskDefinition
  type: AssignmentType;
  state: 'available' | 'in-progress' | 'completed' | 'informed';
  settlerId?: Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  dependsOn?: string;
  name?: string;
  settlerFoundId?: Types.ObjectId;
  description?: string;
  completionMessage?: string;
  duration?: number;
  unlocks?: string;
  plannedRewards?: Record<string, number>;
  adjustments?: {
    adjustedDuration: number;
    effectiveSpeed: number;
    lootMultiplier: number;
    adjustedPlannedRewards: Record<string, number>;
    effects: {
      speedEffects: string[];
      lootEffects: string[];
      traitEffects: string[];
    };
  };
}

const AssignmentSchema = new Schema(
  {
    colonyId: { type: Schema.Types.ObjectId, ref: 'Colony', required: true },
    taskId: { type: String, required: false },
    type: { type: String,  required: true },
    state: { type: String, default: 'available' },
    settlerId: { type: Schema.Types.ObjectId, ref: 'Settler', required: false },
    dependsOn: {type: String, required: false },
    completionMessage: { type: String, required: false },
    startedAt: {type: Date, required: false},
    completedAt: {type: Date, required: false},
    name: {type: String, required: false},
    settlerFoundId: { type: Schema.Types.ObjectId, ref: 'Settler', required: false },
    description: {type: String, required: false},
    duration: {type: Number, required: false},
    unlocks: {type: String, required: false},
    plannedRewards: { type: Schema.Types.Mixed, required: false },
    adjustments: { type: Schema.Types.Mixed, required: false },
  },
  { timestamps: true, versionKey: false },
  
);

AssignmentSchema.index(
  { colonyId: 1, taskId: 1 },
  { unique: true, sparse: true }
);
AssignmentSchema.index({ state: 1 });

export type AssignmentDoc = HydratedDocument<IAssignment>;

export const Assignment = model<AssignmentDoc>('Assignment', AssignmentSchema);
