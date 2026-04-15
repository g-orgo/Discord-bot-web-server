import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../createApp.js';
import '../test/setup.js';

const app = createApp();

const validUser = {
  email: 'test@raptor.dev',
  password: 'secret123',
  displayName: 'Tester',
};

// ── Register ─────────────────────────────────────────────────
describe('POST /auth/register', () => {
  it('creates a new user and returns a JWT', async () => {
    const res = await request(app).post('/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toBe(validUser.email);
    expect(res.body.displayName).toBe(validUser.displayName);
  });

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/auth/register').send(validUser);
    const res = await request(app).post('/auth/register').send(validUser);
    expect(res.status).toBe(409);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/auth/register').send({ password: 'abc123', displayName: 'X' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com', password: '123', displayName: 'X' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'notanemail', password: 'abc123', displayName: 'X' });
    expect(res.status).toBe(400);
  });
});

// ── Login ─────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  it('returns a JWT with valid credentials', async () => {
    await request(app).post('/auth/register').send(validUser);
    const res = await request(app).post('/auth/login').send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('returns 401 with wrong password', async () => {
    await request(app).post('/auth/register').send(validUser);
    const res = await request(app).post('/auth/login').send({ email: validUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'ghost@raptor.dev', password: 'abc123' });
    expect(res.status).toBe(401);
  });
});

// ── Me ────────────────────────────────────────────────────────
describe('GET /auth/me', () => {
  it('returns user profile with a valid token', async () => {
    const reg = await request(app).post('/auth/register').send(validUser);
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(validUser.email);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});

// ── Profile ───────────────────────────────────────────────────
describe('PUT /auth/profile', () => {
  it('updates discordUsername', async () => {
    const reg = await request(app).post('/auth/register').send(validUser);
    const res = await request(app)
      .put('/auth/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ discordUsername: 'raptor_fan' });
    expect(res.status).toBe(200);
    expect(res.body.discordUsername).toBe('raptor_fan');
  });

  it('clears discordUsername when null is sent', async () => {
    const reg = await request(app).post('/auth/register').send(validUser);
    await request(app)
      .put('/auth/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ discordUsername: 'raptor_fan' });
    const res = await request(app)
      .put('/auth/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ discordUsername: null });
    expect(res.status).toBe(200);
    expect(res.body.discordUsername).toBeNull();
  });
});
