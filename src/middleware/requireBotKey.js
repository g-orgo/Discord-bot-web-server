import { DISCORD_BOT_SECRET } from '../config.js';

export function requireBotKey(req, res, next) {
  const key = req.headers['x-bot-secret'];
  if (!key || key !== DISCORD_BOT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}
