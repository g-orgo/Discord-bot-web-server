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

Single-file Express application (`app.js`) providing JWT-based authentication.

**User store:** In-memory array (`USERS`). Pre-seeded with one admin user from env vars. Registered users are added at runtime — **all data is lost on restart**.

**Auth flow:**
1. Client sends `POST /auth/register` or `POST /auth/login`
2. Server validates credentials, hashes password with bcrypt (register only)
3. Returns a signed JWT (`jsonwebtoken`, 7-day expiry)
4. Client stores token in `sessionStorage` and sends it as `Authorization: Bearer <token>` on subsequent requests

**Middleware:** `requireAuth` — validates Bearer JWT on protected routes.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Health check |
| `POST` | `/auth/login` | No | Login → `{ token, email, displayName }` |
| `POST` | `/auth/register` | No | Register → `{ token, email, displayName }` |
| `GET` | `/auth/me` | Bearer JWT | Returns authenticated user profile |

## Key Conventions

**Single-file app.** Keep all logic in `app.js` unless explicitly asked to split.

**ESM only.** `"type": "module"` — use `import`/`export`, never `require`.

**In-memory store.** `USERS` array resets on restart — no persistence without discussion.

**Passwords are always hashed.** Use `bcryptjs` — never store or log plain-text passwords.

**Input validation at the route level.** Validate type, format, and length before any business logic.
