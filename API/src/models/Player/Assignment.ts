// models/assignment.model.ts
import { Schema, model, Types, HydratedDocument } from 'mongoose';

export type AssignmentType =
  | 'quest'
  | 'farming'
  | 'exploration'
  | 'crafting'
  | 'defence'
  | 'building';

export interface IAssignment {
  colonyId: Types.ObjectId;
  taskId?: string; // from TaskDefinition
  type: AssignmentType;
  state: 'available' | 'in-progress' | 'completed' | 'informed';
  settlerId?: Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  dependsOn?: string;
  name: string;
  settlerFoundId?: Types.ObjectId;
  description?: string;
  completionMessage?: string;
  duration: number;
  unlocks?: string;
  location?: {
    x: number;
    y: number;
  };
  plannedRewards?: Record<string, number>;
  actualTransferredItems?: Record<string, number>;
  adjustments?: {
    adjustedDuration: number;
    effectiveSpeed: number;
    lootMultiplier: number;
    // adjustedPlannedRewards: Record<string, number>;
    // effects?: {
    //   speedEffects: string[];
    //   lootEffects: string[];
    //   traitEffects: string[];
    // };
  };
}

const AssignmentSchema = new Schema(
  {
    serverId: { type: String, required: false },
    colonyId: { type: Schema.Types.ObjectId, ref: 'Colony', required: true },
    taskId: { type: String, required: false },
    type: { type: String, required: true },
    state: { type: String, default: 'available' },
    settlerId: { type: Schema.Types.ObjectId, ref: 'Settler', required: false },
    dependsOn: { type: String, required: false },
    completionMessage: { type: String, required: false },
    startedAt: { type: Date, required: false },
    completedAt: { type: Date, required: false },
    name: { type: String, required: true },
    settlerFoundId: { type: Schema.Types.ObjectId, ref: 'Settler', required: false },
    description: { type: String, required: false },
    duration: { type: Number, required: true },
    unlocks: { type: String, required: false },
    plannedRewards: { type: Schema.Types.Mixed, required: false },
    location: {
      type: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
      },
      required: false,
      default: {}
    },
    adjustments: { type: Schema.Types.Mixed, required: false },
    actualTransferredItems: { type: Schema.Types.Mixed, required: false }
  },
  { timestamps: true, versionKey: false },

);

AssignmentSchema.index(
  { colonyId: 1, type: 1, 'location.x': 1, 'location.y': 1 },
  { name: 'exploration_grid_index' }
);
AssignmentSchema.index({ state: 1 });

AssignmentSchema.index( 
  { colonyId: 1, taskId: 1 },
  { unique: true, partialFilterExpression: { taskId: { $exists: true } } }
);

export type AssignmentDoc = HydratedDocument<IAssignment>;

export const Assignment = model<AssignmentDoc>('Assignment', AssignmentSchema);
