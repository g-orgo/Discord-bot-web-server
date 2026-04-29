import { Router } from 'express';
import { User } from '../models/User.js';
import { HistoryEntry } from '../models/HistoryEntry.js';
import { PendingHistoryEntry } from '../models/PendingHistoryEntry.js';
import { requireBotKey } from '../middleware/requireBotKey.js';
import { discordHistoryReadRateLimit } from '../middleware/rateLimit.js';
import { emitToUser } from '../sse.js';
import { normalizeDiscordUsername, queuePendingDiscordHistory } from '../history/pendingDiscordHistory.js';

const router = Router();

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/history', requireBotKey, discordHistoryReadRateLimit, async (req, res) => {
  const discordUsername = req.query?.discordUsername;

  if (typeof discordUsername !== 'string' || !discordUsername.trim()) {
    return res.status(400).json({ error: 'discordUsername query param is required.' });
  }

  try {
    const user = await User.findOne({
      discordUsername: { $regex: new RegExp(`^${escapeRegex(discordUsername.trim())}$`, 'i') },
    }).lean();

    if (!user) {
      const pendingEntries = await PendingHistoryEntry.find({
        discordUsernameNormalized: normalizeDiscordUsername(discordUsername),
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return res.json(pendingEntries.map(e => ({
        id: e._id.toString(),
        userMessage: e.userMessage,
        botResponse: e.botResponse,
        model: e.model,
        source: e.source ?? 'discord',
        timestamp: e.createdAt,
        sessionId: null,
      })));
    }

    const entries = await HistoryEntry.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json(entries.map(e => ({
      id: e._id.toString(),
      userMessage: e.userMessage,
      botResponse: e.botResponse,
      model: e.model,
      source: e.source ?? 'web',
      timestamp: e.createdAt,
      sessionId: e.sessionId ?? null,
    })));
  } catch (err) {
    console.error('[discord/history][GET] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /discord/history
 * Called by the Discord bot to save a chat exchange linked to a web user by discordUsername.
 * Requires the X-Bot-Secret header.
 * Body: { discordUsername, userMessage, botResponse, model? }
 */
router.post('/history', requireBotKey, async (req, res) => {
  const { discordUsername, userMessage, botResponse, model } = req.body ?? {};

  if (typeof discordUsername !== 'string' || typeof userMessage !== 'string' || typeof botResponse !== 'string') {
    console.warn(`[discord/history] Validation failed — types: discordUsername=${typeof discordUsername}, userMessage=${typeof userMessage}, botResponse=${typeof botResponse}`);
    return res.status(400).json({ error: 'discordUsername, userMessage and botResponse are required.' });
  }

  try {
    const user = await User.findOne({ discordUsername: { $regex: new RegExp(`^${escapeRegex(discordUsername.trim())}$`, 'i') } }).lean();
    if (!user) {
      console.warn(`[discord/history] No user found with discordUsername: "${discordUsername.trim()}"`);
      await queuePendingDiscordHistory({
        discordUsername,
        userMessage,
        botResponse,
        model,
      });
      return res.status(204).end();
    }

    await HistoryEntry.create({
      userId: user._id,
      userMessage,
      botResponse,
      model: model ?? null,
      source: 'discord',
    });

    emitToUser(user._id.toString(), 'history:new', { source: 'discord' });
    res.status(204).end();
  } catch (err) {
    console.error(`[discord/history] Unexpected error:`, err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
