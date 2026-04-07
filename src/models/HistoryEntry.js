import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userMessage: { type: String, required: true },
  botResponse: { type: String, required: true },
  model: { type: String, default: null },
  source: { type: String, enum: ['web', 'discord'], default: 'web' },
}, { timestamps: true });

export const HistoryEntry = mongoose.model('HistoryEntry', historySchema);
