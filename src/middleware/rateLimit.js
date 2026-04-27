import expressRateLimit from 'express-rate-limit';

const AUTH_LIMIT = 10;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const authAttempts = new Map();
const DISCORD_HISTORY_READ_LIMIT = 20;
const DISCORD_HISTORY_READ_WINDOW_MS = 60 * 1000;

export const discordHistoryReadRateLimit = expressRateLimit({
  windowMs: DISCORD_HISTORY_READ_WINDOW_MS,
  max: DISCORD_HISTORY_READ_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/** Clears all tracked attempts. Used in tests to prevent cross-test pollution. */
export function resetRateLimit() { authAttempts.clear(); }

export function rateLimit(req, res, next) {
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  const now = Date.now();
  const entry = authAttempts.get(ip);

  if (!entry || now - entry.windowStart > AUTH_WINDOW_MS) {
    authAttempts.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (entry.count >= AUTH_LIMIT) {
    return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  }

  entry.count += 1;
  next();
}
