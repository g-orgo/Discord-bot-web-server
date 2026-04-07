import express from 'express';
import { PORT } from './src/config.js';
import { connectDb } from './src/db.js';
import { seedAdmin } from './src/seed.js';
import { cors } from './src/middleware/cors.js';
import authRouter from './src/routes/auth.js';
import historyRouter from './src/routes/history.js';
import discordRouter from './src/routes/discord.js';

const app = express();
app.use(express.json());
app.use(cors);
app.options('*', (_, res) => res.sendStatus(204));

app.get('/', (_, res) => res.json({ message: 'Raptor Chatbot Server is running.' }));
app.use('/auth/history', historyRouter);
app.use('/auth', authRouter);
app.use('/discord', discordRouter);

connectDb()
  .then(async () => {
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`raptor-chatbot-server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('[boot] Fatal error:', err.message);
    process.exit(1);
  });
