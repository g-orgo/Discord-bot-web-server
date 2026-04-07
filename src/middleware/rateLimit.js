const AUTH_LIMIT = 10;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const authAttempts = new Map();

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
