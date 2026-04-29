import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../createApp.js';
import { HistoryEntry } from '../models/HistoryEntry.js';
import { PendingHistoryEntry } from '../models/PendingHistoryEntry.js';
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

  it('claims pending discord history when discordUsername is provided', async () => {
    await PendingHistoryEntry.create({
      discordUsernameNormalized: 'claimonregister',
      userMessage: 'pending before register',
      botResponse: 'pending reply',
      source: 'discord',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await request(app).post('/auth/register').send({
      email: 'register-claim@raptor.dev',
      password: 'secret123',
      displayName: 'Register Claim',
      discordUsername: 'ClaimOnRegister',
    });

    expect(res.status).toBe(201);
    expect(res.body.discordUsername).toBe('ClaimOnRegister');

    const login = await request(app).post('/auth/login').send({
      email: 'register-claim@raptor.dev',
      password: 'secret123',
    });

    const history = await request(app)
      .get('/auth/history')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0].userMessage).toBe('pending before register');

    const pendingLeft = await PendingHistoryEntry.find({ discordUsernameNormalized: 'claimonregister' }).lean();
    expect(pendingLeft).toHaveLength(0);
  });

  it('returns 409 when discordUsername is already linked to another account', async () => {
    await request(app).post('/auth/register').send({
      email: 'discord-owner@raptor.dev',
      password: 'secret123',
      displayName: 'Discord Owner',
      discordUsername: 'shared_name',
    });

    const res = await request(app).post('/auth/register').send({
      email: 'discord-duplicate@raptor.dev',
      password: 'secret123',
      displayName: 'Discord Duplicate',
      discordUsername: 'shared_name',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Discord username already linked to another account.');
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

  it('claims pending discord history after setting discordUsername', async () => {
    await PendingHistoryEntry.create({
      discordUsernameNormalized: 'claimonprofile',
      userMessage: 'pending before profile update',
      botResponse: 'pending profile reply',
      source: 'discord',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const reg = await request(app).post('/auth/register').send({
      email: 'profile-claim@raptor.dev',
      password: 'secret123',
      displayName: 'Profile Claim',
    });

    const profile = await request(app)
      .put('/auth/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ discordUsername: 'ClaimOnProfile' });

    expect(profile.status).toBe(200);
    expect(profile.body.discordUsername).toBe('ClaimOnProfile');

    const history = await request(app)
      .get('/auth/history')
      .set('Authorization', `Bearer ${reg.body.token}`);

    expect(history.status).toBe(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0].userMessage).toBe('pending before profile update');

    const pendingLeft = await PendingHistoryEntry.find({ discordUsernameNormalized: 'claimonprofile' }).lean();
    expect(pendingLeft).toHaveLength(0);

    const persisted = await HistoryEntry.findOne({ userMessage: 'pending before profile update' }).lean();
    expect(persisted).not.toBeNull();
  });

  it('returns 409 when trying to set an already linked discordUsername', async () => {
    const regA = await request(app).post('/auth/register').send({
      email: 'profile-owner@raptor.dev',
      password: 'secret123',
      displayName: 'Profile Owner',
      discordUsername: 'taken_name',
    });

    const regB = await request(app).post('/auth/register').send({
      email: 'profile-second@raptor.dev',
      password: 'secret123',
      displayName: 'Profile Second',
    });

    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);

    const res = await request(app)
      .put('/auth/profile')
      .set('Authorization', `Bearer ${regB.body.token}`)
      .send({ discordUsername: 'taken_name' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Discord username already linked to another account.');
  });
});
