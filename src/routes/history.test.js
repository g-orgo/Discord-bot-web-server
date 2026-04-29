import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../createApp.js';
import '../test/setup.js';

const app = createApp();

let userSequence = 0;

async function registerAndLogin() {
  userSequence += 1;
  const email = `user-${Date.now()}-${userSequence}@raptor.dev`;
  const reg = await request(createApp())
    .post('/auth/register')
    .send({ email, password: 'secret123', displayName: 'Tester' });
  expect(reg.status).toBe(201);
  expect(reg.body.token).toBeTruthy();
  return reg.body.token;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── GET ───────────────────────────────────────────────────────
describe('GET /auth/history', () => {
  it('returns empty array for a new user', async () => {
    const token = await registerAndLogin();
    const res = await request(app).get('/auth/history').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/auth/history');
    expect(res.status).toBe(401);
  });
});

// ── POST ──────────────────────────────────────────────────────
describe('POST /auth/history', () => {
  it('creates an entry and returns it', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post('/auth/history')
      .set(authHeader(token))
      .send({ userMessage: 'hello', botResponse: 'hi', model: 'llama3', sessionId: 'session-1' });
    expect(res.status).toBe(201);
    expect(res.body.userMessage).toBe('hello');
    expect(res.body.sessionId).toBe('session-1');
  });

  it('returns 400 when userMessage is missing', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post('/auth/history')
      .set(authHeader(token))
      .send({ botResponse: 'hi' });
    expect(res.status).toBe(400);
  });

  it('stored entry appears in GET', async () => {
    const token = await registerAndLogin();
    await request(app).post('/auth/history').set(authHeader(token)).send({ userMessage: 'q', botResponse: 'a', sessionId: 'sid' });
    const res = await request(app).get('/auth/history').set(authHeader(token));
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0].sessionId).toBe('sid');
  });

  it('does not expose entries to another user', async () => {
    const token1 = await registerAndLogin();
    const token2 = await registerAndLogin();
    await request(app).post('/auth/history').set(authHeader(token1)).send({ userMessage: 'q', botResponse: 'a' });
    const res = await request(app).get('/auth/history').set(authHeader(token2));
    expect(res.body).toHaveLength(0);
  });
});

// ── PATCH /:id/session ────────────────────────────────────────
describe('PATCH /auth/history/:id/session', () => {
  it('updates the sessionId of an entry', async () => {
    const token = await registerAndLogin();
    await request(app).post('/auth/history').set(authHeader(token)).send({ userMessage: 'q', botResponse: 'a' });
    const list = await request(app).get('/auth/history').set(authHeader(token));
    const id = list.body[0].id;

    const res = await request(app)
      .patch(`/auth/history/${id}/session`)
      .set(authHeader(token))
      .send({ sessionId: 'new-session-uuid' });
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe('new-session-uuid');
  });

  it('returns 404 when entry belongs to another user', async () => {
    const token1 = await registerAndLogin();
    const token2 = await registerAndLogin();
    await request(app).post('/auth/history').set(authHeader(token1)).send({ userMessage: 'q', botResponse: 'a' });
    const list = await request(app).get('/auth/history').set(authHeader(token1));
    const id = list.body[0].id;

    const res = await request(app)
      .patch(`/auth/history/${id}/session`)
      .set(authHeader(token2))
      .send({ sessionId: 'hacked' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /session/:sessionId ────────────────────────────────
describe('DELETE /auth/history/session/:sessionId', () => {
  it('removes all entries with the given sessionId', async () => {
    const token = await registerAndLogin();
    await request(app).post('/auth/history').set(authHeader(token)).send({ userMessage: 'q1', botResponse: 'a1', sessionId: 'sid' });
    await request(app).post('/auth/history').set(authHeader(token)).send({ userMessage: 'q2', botResponse: 'a2', sessionId: 'sid' });
    await request(app).post('/auth/history').set(authHeader(token)).send({ userMessage: 'q3', botResponse: 'a3', sessionId: 'other' });

    const del = await request(app).delete('/auth/history/session/sid').set(authHeader(token));
    expect(del.status).toBe(204);

    const list = await request(app).get('/auth/history').set(authHeader(token));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].sessionId).toBe('other');
  });
});

// ── DELETE /entry/:id ─────────────────────────────────────────
describe('DELETE /auth/history/entry/:id', () => {
  it('removes a single entry', async () => {
    const token = await registerAndLogin();
    await request(app).post('/auth/history').set(authHeader(token)).send({ userMessage: 'q1', botResponse: 'a1' });
    await request(app).post('/auth/history').set(authHeader(token)).send({ userMessage: 'q2', botResponse: 'a2' });
    const list = await request(app).get('/auth/history').set(authHeader(token));
    const id = list.body[0].id;

    const del = await request(app).delete(`/auth/history/entry/${id}`).set(authHeader(token));
    expect(del.status).toBe(204);

    const after = await request(app).get('/auth/history').set(authHeader(token));
    expect(after.body).toHaveLength(1);
  });

  it('returns 404 for an entry belonging to another user', async () => {
    const token1 = await registerAndLogin();
    const token2 = await registerAndLogin();
    await request(app).post('/auth/history').set(authHeader(token1)).send({ userMessage: 'q', botResponse: 'a' });
    const list = await request(app).get('/auth/history').set(authHeader(token1));
    const id = list.body[0].id;

    const res = await request(app).delete(`/auth/history/entry/${id}`).set(authHeader(token2));
    expect(res.status).toBe(404);
  });
});

// ── DELETE / (clear all) ──────────────────────────────────────
describe('DELETE /auth/history', () => {
  it('clears all entries for the authenticated user', async () => {
    const token = await registerAndLogin();
    await request(app).post('/auth/history').set(authHeader(token)).send({ userMessage: 'q', botResponse: 'a' });
    await request(app).delete('/auth/history').set(authHeader(token));
    const res = await request(app).get('/auth/history').set(authHeader(token));
    expect(res.body).toHaveLength(0);
  });
});
