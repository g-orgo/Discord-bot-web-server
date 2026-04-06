import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT ?? 3001;
const JWT_SECRET = process.env.JWT_SECRET ?? 'raptor-dev-secret-change-in-prod';
const JWT_EXPIRES_IN = '7d';

// ---------------------------------------------------------------------------
// In-memory user store. Seed via ADMIN_EMAIL / ADMIN_PASSWORD env vars,
// or use the defaults below for local development only.
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@raptor.local';
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD ?? 'raptor123';
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASSWORD_PLAIN, 10);

const USERS = [
  { id: '1', email: ADMIN_EMAIL, passwordHash: ADMIN_HASH, displayName: 'Admin' },
];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.options('*', (_, res) => res.sendStatus(204));

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid.' });
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/', (_, res) => res.json({ message: 'Raptor Chatbot Server is running.' }));

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  res.json({ token, displayName: user.displayName, email: user.email });
});

app.post('/auth/register', (req, res) => {
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

  if (USERS.find(u => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const newUser = {
    id: String(Date.now()),
    email: normalizedEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    displayName: displayName.trim(),
  };

  USERS.push(newUser);

  const token = jwt.sign(
    { sub: newUser.id, email: newUser.email, displayName: newUser.displayName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  res.status(201).json({ token, displayName: newUser.displayName, email: newUser.email });
});

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ sub: req.user.sub, email: req.user.email, displayName: req.user.displayName });
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`raptor-chatbot-server running on http://localhost:${PORT}`);
});
