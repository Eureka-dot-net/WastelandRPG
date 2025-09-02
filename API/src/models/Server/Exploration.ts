import { Schema, model, Types, HydratedDocument } from 'mongoose';

export interface IExploration {
  serverId: string;
  colonyId: Types.ObjectId;
  settlerId: Types.ObjectId;
  x: number;
  y: number;
  state: 'in-progress' | 'completed' | 'informed';
  startedAt: Date;
  completedAt: Date;
  plannedRewards: Record<string, number>;
  settlerFoundId?: Types.ObjectId;
  adjustments: {
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

const ExplorationSchema = new Schema(
  {
    serverId: { type: String, required: true, index: true },
    colonyId: { type: Schema.Types.ObjectId, ref: 'Colony', required: true, index: true },
    settlerId: { type: Schema.Types.ObjectId, ref: 'Settler', required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    state: { type: String, default: 'in-progress', index: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    plannedRewards: { type: Schema.Types.Mixed, required: true },
    settlerFoundId: { type: Schema.Types.ObjectId, ref: 'Settler', required: false },
    adjustments: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false }
);

// Unique index for (serverId, colonyId, x, y) - only one exploration per tile per colony
ExplorationSchema.index({ serverId: 1, colonyId: 1, x: 1, y: 1 }, { unique: true });
// Index for finding completed explorations
ExplorationSchema.index({ serverId: 1, state: 1, completedAt: 1 });

export type ExplorationDoc = HydratedDocument<IExploration>;
export const ExplorationModel = model<ExplorationDoc>('Exploration', ExplorationSchema);