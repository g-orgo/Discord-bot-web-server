import { Router } from 'express';
import { User } from '../models/User.js';
import { HistoryEntry } from '../models/HistoryEntry.js';
import { requireBotKey } from '../middleware/requireBotKey.js';
import { emitToUser } from '../sse.js';

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
    console.warn(`[discord/history] Validation failed — types: discordUsername=${typeof discordUsername}, userMessage=${typeof userMessage}, botResponse=${typeof botResponse}`);
    return res.status(400).json({ error: 'discordUsername, userMessage and botResponse are required.' });
  }

  try {
    const user = await User.findOne({ discordUsername: { $regex: new RegExp(`^${discordUsername.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean();
    if (!user) {
      console.warn(`[discord/history] No user found with discordUsername: "${discordUsername.trim()}"`);
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
