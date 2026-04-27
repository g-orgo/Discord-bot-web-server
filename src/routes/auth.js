import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config.js';
import { emitToUser } from '../sse.js';
import { claimPendingDiscordHistoryForUser } from '../history/pendingDiscordHistory.js';

const router = Router();

async function isDiscordUsernameTaken(discordUsername, excludeUserId = null) {
  if (!discordUsername) return false;

  const existing = await User.findOne({ discordUsername })
    .collation({ locale: 'en', strength: 2 })
    .select('_id')
    .lean();

  if (!existing) return false;
  if (!excludeUserId) return true;
  return existing._id.toString() !== excludeUserId;
}

router.post('/login', rateLimit, async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, displayName: user.displayName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.json({ token, displayName: user.displayName, email: user.email, discordUsername: user.discordUsername ?? null });
  } catch {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/register', rateLimit, async (req, res) => {
  const { email, password, displayName, discordUsername } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
    return res.status(400).json({ error: 'email, password and displayName are required.' });
  }

  if (discordUsername !== undefined && discordUsername !== null && typeof discordUsername !== 'string') {
    return res.status(400).json({ error: 'discordUsername must be a string or null when provided.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  if (displayName.trim().length < 2) {
    return res.status(400).json({ error: 'Display name must be at least 2 characters.' });
  }

  const trimmedDiscordUsername = typeof discordUsername === 'string' ? discordUsername.trim() : null;
  if (trimmedDiscordUsername !== null && trimmedDiscordUsername.length < 2) {
    return res.status(400).json({ error: 'discordUsername must be at least 2 characters.' });
  }

  try {
    if (await isDiscordUsernameTaken(trimmedDiscordUsername)) {
      return res.status(409).json({ error: 'Discord username already linked to another account.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      displayName: displayName.trim(),
      discordUsername: trimmedDiscordUsername || null,
    });

    const claimedCount = await claimPendingDiscordHistoryForUser({
      userId: user._id,
      discordUsername: user.discordUsername,
    });

    if (claimedCount > 0) {
      emitToUser(user._id.toString(), 'history:new', { source: 'discord' });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, displayName: user.displayName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.status(201).json({ token, displayName: user.displayName, email: user.email, discordUsername: user.discordUsername ?? null });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.discordUsername) {
        return res.status(409).json({ error: 'Discord username already linked to another account.' });
      }
      return res.status(409).json({ error: 'Email already registered.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ sub: req.user.sub, email: user.email, displayName: user.displayName, discordUsername: user.discordUsername ?? null });
  } catch {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  const { discordUsername } = req.body ?? {};

  if (discordUsername !== null && typeof discordUsername !== 'string') {
    return res.status(400).json({ error: 'discordUsername must be a string or null.' });
  }

  const trimmed = typeof discordUsername === 'string' ? discordUsername.trim() : null;

  if (trimmed !== null && trimmed.length < 2) {
    return res.status(400).json({ error: 'discordUsername must be at least 2 characters.' });
  }

  try {
    if (await isDiscordUsernameTaken(trimmed, req.user.sub)) {
      return res.status(409).json({ error: 'Discord username already linked to another account.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.sub,
      { discordUsername: trimmed || null },
      { new: true },
    ).lean();

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const claimedCount = await claimPendingDiscordHistoryForUser({
      userId: user._id,
      discordUsername: user.discordUsername,
    });

    if (claimedCount > 0) {
      emitToUser(user._id.toString(), 'history:new', { source: 'discord' });
    }

    res.json({ discordUsername: user.discordUsername ?? null });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Discord username already linked to another account.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
