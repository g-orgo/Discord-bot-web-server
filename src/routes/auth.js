import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config.js';

const router = Router();

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
  const { email, password, displayName } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
    return res.status(400).json({ error: 'email, password and displayName are required.' });
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

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: normalizedEmail, passwordHash, displayName: displayName.trim() });

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, displayName: user.displayName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.status(201).json({ token, displayName: user.displayName, email: user.email, discordUsername: null });
  } catch (err) {
    if (err.code === 11000) {
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
    const user = await User.findByIdAndUpdate(
      req.user.sub,
      { discordUsername: trimmed || null },
      { new: true },
    ).lean();

    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ discordUsername: user.discordUsername ?? null });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Discord username already linked to another account.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
