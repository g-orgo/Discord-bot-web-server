import { Router } from 'express';
import { HistoryEntry } from '../models/HistoryEntry.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const entries = await HistoryEntry.find({ userId: req.user.sub })
      .sort({ createdAt: -1 })
      .lean();
    res.json(entries.map(e => ({
      userMessage: e.userMessage,
      botResponse: e.botResponse,
      model: e.model,
      timestamp: e.createdAt,
    })));
  } catch {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { userMessage, botResponse, model } = req.body ?? {};
  if (typeof userMessage !== 'string' || typeof botResponse !== 'string') {
    return res.status(400).json({ error: 'userMessage and botResponse are required.' });
  }
  try {
    const entry = await HistoryEntry.create({
      userId: req.user.sub,
      userMessage,
      botResponse,
      model: model ?? null,
    });
    res.status(201).json({
      userMessage: entry.userMessage,
      botResponse: entry.botResponse,
      model: entry.model,
      timestamp: entry.createdAt,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/', requireAuth, async (req, res) => {
  try {
    await HistoryEntry.deleteMany({ userId: req.user.sub });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
