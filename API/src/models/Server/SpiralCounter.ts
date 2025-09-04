import { Schema, model } from 'mongoose';

const spiralCounterSchema = new Schema({
  serverId: { type: String, required: true, unique: true },
  nextIndex: { type: Number, default: 0 }
}, {
  timestamps: true,
  versionKey: false
});

// Note: serverId already has unique index from field definition above

export const SpiralCounter = model('SpiralCounter', spiralCounterSchema);