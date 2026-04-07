import { Router } from 'express';
import { User } from '../models/User.js';
import { HistoryEntry } from '../models/HistoryEntry.js';
import { requireBotKey } from '../middleware/requireBotKey.js';

const router = Router();

/**
 * POST /discord/history
 * Called by the Discord bot to save a chat exchange linked to a web user by discordUsername.
 * Requires the X-Bot-Secret header.
 * Body: { discordUsername, userMessage, botResponse, model? }
 */
router.post('/history', requireBotKey, async (req, res) => {
  const { discordUsername, userMessage, botResponse, model } = req.body ?? {};

  if (typeof discordUsername !== 'string' || typeof userMessage !== 'string' || typeof botResponse !== 'string') {
    return res.status(400).json({ error: 'discordUsername, userMessage and botResponse are required.' });
  }

  try {
    const user = await User.findOne({ discordUsername: { $regex: new RegExp(`^${discordUsername.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean();
    if (!user) {
      // No linked account — silently ignore (not an error from the bot's perspective)
      return res.status(204).end();
    }

    await HistoryEntry.create({
      userId: user._id,
      userMessage,
      botResponse,
      model: model ?? null,
    });

    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
