import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { HistoryEntry } from '../models/HistoryEntry.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { addClient, removeClient, emitToUser } from '../sse.js';
import { JWT_SECRET } from '../config.js';

const router = Router();

router.get('/stream', (req, res) => {
  // EventSource cannot send headers — accept token as query param for this endpoint only
  const token = req.query.token;
  if (!token) return res.status(401).end();

  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  addClient(user.sub, res);

  // Keep-alive ping every 25s to prevent proxy/browser timeouts
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* ignore */ }
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    removeClient(user.sub, res);
  });
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const entries = await HistoryEntry.find({ userId: req.user.sub })
      .sort({ createdAt: -1 })
      .lean();
    res.json(entries.map(e => ({
      userMessage: e.userMessage,
      botResponse: e.botResponse,
      model: e.model,
      source: e.source ?? 'web',
      timestamp: e.createdAt,
      sessionId: e.sessionId ?? null,
    })));
  } catch {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { userMessage, botResponse, model, sessionId } = req.body ?? {};
  if (typeof userMessage !== 'string' || typeof botResponse !== 'string') {
    return res.status(400).json({ error: 'userMessage and botResponse are required.' });
  }
  try {
    const entry = await HistoryEntry.create({
      userId: req.user.sub,
      userMessage,
      botResponse,
      model: model ?? null,
      sessionId: typeof sessionId === 'string' ? sessionId : null,
    });
    emitToUser(req.user.sub, 'history:new', { source: 'web' });
    res.status(201).json({
      userMessage: entry.userMessage,
      botResponse: entry.botResponse,
      model: entry.model,
      timestamp: entry.createdAt,
      sessionId: entry.sessionId ?? null,
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
