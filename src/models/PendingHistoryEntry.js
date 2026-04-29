import mongoose from 'mongoose';

const pendingHistorySchema = new mongoose.Schema({
  discordUsernameNormalized: { type: String, required: true, index: true },
  userMessage: { type: String, required: true },
  botResponse: { type: String, required: true },
  model: { type: String, default: null },
  source: { type: String, enum: ['discord'], default: 'discord' },
  // MongoDB TTL index: the document is auto-removed once expiresAt is reached.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

export const PendingHistoryEntry = mongoose.model('PendingHistoryEntry', pendingHistorySchema);
