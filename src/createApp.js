import express from 'express';
import { cors } from './middleware/cors.js';
import authRouter from './routes/auth.js';
import historyRouter from './routes/history.js';
import discordRouter from './routes/discord.js';

/**
 * Creates and configures the Express application without connecting to the
 * database or starting the HTTP server. Exported for use in tests.
 */
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cors);
  app.options('*', (_, res) => res.sendStatus(204));
  app.get('/', (_, res) => res.json({ message: 'Raptor Chatbot Server is running.' }));
  app.use('/auth/history', historyRouter);
  app.use('/auth', authRouter);
  app.use('/discord', discordRouter);
  return app;
}
