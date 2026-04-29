import { HistoryEntry } from '../models/HistoryEntry.js';
import { PendingHistoryEntry } from '../models/PendingHistoryEntry.js';

const PENDING_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

export function normalizeDiscordUsername(value) {
  return value.trim().toLowerCase();
}

export async function queuePendingDiscordHistory({ discordUsername, userMessage, botResponse, model }) {
  const now = Date.now();

  await PendingHistoryEntry.create({
    discordUsernameNormalized: normalizeDiscordUsername(discordUsername),
    userMessage,
    botResponse,
    model: model ?? null,
    source: 'discord',
    expiresAt: new Date(now + PENDING_HISTORY_TTL_MS),
  });
}

export async function claimPendingDiscordHistoryForUser({ userId, discordUsername }) {
  const normalized = typeof discordUsername === 'string' ? normalizeDiscordUsername(discordUsername) : null;
  if (!normalized) return 0;

  const pendingEntries = await PendingHistoryEntry.find({ discordUsernameNormalized: normalized })
    .sort({ createdAt: 1 })
    .lean();

  if (!pendingEntries.length) return 0;

  await HistoryEntry.insertMany(pendingEntries.map((entry) => ({
    userId,
    userMessage: entry.userMessage,
    botResponse: entry.botResponse,
    model: entry.model ?? null,
    source: 'discord',
    sessionId: null,
  })));

  await PendingHistoryEntry.deleteMany({ _id: { $in: pendingEntries.map((entry) => entry._id) } });
  return pendingEntries.length;
}
