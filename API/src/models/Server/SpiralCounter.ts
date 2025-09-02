import { Schema, model } from 'mongoose';

const spiralCounterSchema = new Schema({
  serverId: { type: String, required: true, unique: true },
  nextIndex: { type: Number, default: 0 }
}, {
  timestamps: true,
  versionKey: false
});

// Index for efficient server lookup
spiralCounterSchema.index({ serverId: 1 }, { unique: true });

export const SpiralCounter = model('SpiralCounter', spiralCounterSchema);