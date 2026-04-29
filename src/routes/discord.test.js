import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../createApp.js';
import { User } from '../models/User.js';
import { HistoryEntry } from '../models/HistoryEntry.js';
import { PendingHistoryEntry } from '../models/PendingHistoryEntry.js';
import '../test/setup.js';

const app = createApp();
const botHeader = { 'X-Bot-Secret': 'raptor-bot-secret-change-in-prod' };

describe('GET /discord/history', () => {
  it('returns 400 when discordUsername is missing', async () => {
    const res = await request(app)
      .get('/discord/history')
      .set(botHeader);

    expect(res.status).toBe(400);
  });

  it('returns entries for discordUsername (case-insensitive)', async () => {
    const user = await User.create({
      email: 'discord-user@raptor.dev',
      passwordHash: 'hashed',
      displayName: 'Discord User',
      discordUsername: 'RaptorFan',
    });

    await HistoryEntry.create({
      userId: user._id,
      userMessage: 'hello',
      botResponse: 'hi',
      source: 'discord',
    });

    const res = await request(app)
      .get('/discord/history')
      .set(botHeader)
      .query({ discordUsername: 'raptorfan' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].userMessage).toBe('hello');
    expect(res.body[0].source).toBe('discord');
  });

  it('returns pending entries when no user is registered yet', async () => {
    await PendingHistoryEntry.create({
      discordUsernameNormalized: 'futureuser',
      userMessage: 'future hello',
      botResponse: 'future hi',
      source: 'discord',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await request(app)
      .get('/discord/history')
      .set(botHeader)
      .query({ discordUsername: 'FutureUser' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].userMessage).toBe('future hello');
    expect(res.body[0].source).toBe('discord');
  });

  it('rate limits after about 20 requests/min per IP', async () => {
    await User.create({
      email: 'discord-user-2@raptor.dev',
      passwordHash: 'hashed',
      displayName: 'Discord User 2',
      discordUsername: 'RateLimitUser',
    });

    let limited = false;

    for (let i = 0; i < 25; i += 1) {
      const res = await request(app)
        .get('/discord/history')
        .set(botHeader)
        .query({ discordUsername: 'RateLimitUser' });

      if (res.status === 429) {
        limited = true;
        break;
      }
    }

    expect(limited).toBe(true);
  });
});

describe('POST /discord/history', () => {
  it('stores pending history when user does not exist', async () => {
    const before = Date.now();

    const res = await request(app)
      .post('/discord/history')
      .set(botHeader)
      .send({
        discordUsername: 'NewDiscordUser',
        userMessage: 'hello from discord',
        botResponse: 'hello from bot',
      });

    expect(res.status).toBe(204);

    const pending = await PendingHistoryEntry.findOne({ discordUsernameNormalized: 'newdiscorduser' }).lean();
    expect(pending).not.toBeNull();
    expect(pending.userMessage).toBe('hello from discord');
    expect(new Date(pending.expiresAt).getTime()).toBeGreaterThan(before + (23 * 60 * 60 * 1000));
  });
});
