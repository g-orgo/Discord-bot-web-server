# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm start         # Run (production)
npm run dev       # Run with node --watch (auto-restart on file changes)
```

No test suite is configured.

## Local development setup

Required `.env` variables (all have safe defaults for local dev — **change in production**):

```
PORT=3001
JWT_SECRET=raptor-dev-secret-change-in-prod
ADMIN_EMAIL=admin@raptor.local
ADMIN_PASSWORD=raptor123
CORS_ORIGIN=http://localhost:5173
```

## Architecture

Express application (`app.js` entry point, routes split under `src/`). Backed by **MongoDB via Mongoose**.

**User store:** MongoDB (`User` model). Seeded with one admin user from env vars on startup — data persists across restarts.

**Auth flow:**
1. Client sends `POST /auth/register` or `POST /auth/login`
2. Server validates credentials, hashes password with bcrypt (register only)
3. Returns a signed JWT (`jsonwebtoken`, 7-day expiry)
4. Client stores token in `sessionStorage` and sends it as `Authorization: Bearer <token>` on subsequent requests

**Middleware:** `requireAuth` — validates Bearer JWT on protected routes. `requireBotKey` — validates `X-Bot-Secret` header on Discord bot routes.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Health check |
| `POST` | `/auth/login` | No | Login → `{ token, email, displayName, discordUsername }` |
| `POST` | `/auth/register` | No | Register → `{ token, email, displayName, discordUsername }` |
| `GET` | `/auth/me` | Bearer JWT | Returns authenticated user profile |
| `PUT` | `/auth/profile` | Bearer JWT | Update `discordUsername` |
| `GET` | `/auth/history` | Bearer JWT | Returns all history entries for user |
| `POST` | `/auth/history` | Bearer JWT | Save a new history entry (source: web) |
| `DELETE` | `/auth/history` | Bearer JWT | Delete all history for user |
| `GET` | `/auth/history/stream` | JWT query param | SSE stream — pushes `history:new` events |
| `POST` | `/discord/history` | X-Bot-Secret | Save history entry linked by discordUsername (source: discord) |

## Key Conventions

**Multi-file structure.** Entry point is `app.js`; routes live in `src/routes/`, models in `src/models/`, middleware in `src/middleware/`.

**ESM only.** `"type": "module"` — use `import`/`export`, never `require`.

**MongoDB persistence.** Data persists across restarts via Mongoose. Do not introduce in-memory state for user data.

**Passwords are always hashed.** Use `bcryptjs` — never store or log plain-text passwords.

**Input validation at the route level.** Validate type, format, and length before any business logic.
