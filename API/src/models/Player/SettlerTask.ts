import { Schema, model, Types } from 'mongoose';

interface Reward {
  [resource: string]: number;
}

export interface ISettlerTask {
  settlerId: Types.ObjectId;
  taskId: string;            // reference to your task template ID
  startedAt: Date;
  completesAt: Date;         // calculated when task is started
  isRunning: boolean;
  isCompleted: boolean;
  rewards: Reward;           // determined at start
  taskType: string;          // e.g., "cleanup", "exploration"
}

const SettlerTaskSchema = new Schema<ISettlerTask>({
  settlerId: { type: Schema.Types.ObjectId, required: true, ref: 'Settler' },
  taskId: { type: String, required: true },
  taskType: { type: String, required: true },
  startedAt: { type: Date, required: true },
  completesAt: { type: Date, required: true },
  isRunning: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  rewards: { type: Object, default: {} },
});

export const SettlerTask = model<ISettlerTask>('SettlerTask', SettlerTaskSchema);
