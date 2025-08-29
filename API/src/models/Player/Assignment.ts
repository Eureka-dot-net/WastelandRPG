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
  state: 'available' | 'in-progress' | 'completed' | 'locked';
  settlerId?: Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  dependsOn?: string;
  name?: string;
  description?: string;
  completionMessage?: string;
  duration?: number;
  unlocks?: string;
  plannedRewards?: Record<string, number>;
}

const AssignmentSchema = new Schema(
  {
    colonyId: { type: Schema.Types.ObjectId, ref: 'Colony', index: true, required: true },
    taskId: { type: String, required: false },
    type: { type: String,  required: true },
    state: { type: String, default: 'available', index: true },
    settlerId: { type: Schema.Types.ObjectId, ref: 'Settler', required: false },
    dependsOn: {type: String, required: false },
    completionMessage: { type: String, required: false },
    startedAt: Date,
    completedAt: Date,
    name: String,
    description: String,
    duration: Number,
    unlocks: String,
    plannedRewards: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
  
);

AssignmentSchema.index(
  { colonyId: 1, taskId: 1 },
  { unique: true, sparse: true }
);

export type AssignmentDoc = HydratedDocument<IAssignment>;

export const Assignment = model<AssignmentDoc>('Assignment', AssignmentSchema);
