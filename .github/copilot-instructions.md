# Raptor Chatbot Server — Workspace Guidelines

Express authentication server for the Raptor Chatbot web frontend. Provides JWT-based login and registration.

## Build & Run

```bash
npm install
npm run dev   # node --watch (auto-restart)
npm start     # production
```

No test suite is configured.

Listens on **port 3001** by default. The `raptor-chatbot-web` Vite proxy forwards `/auth/*` requests here.

## Architecture

Express application (`app.js` entry point, routes split under `src/`). Backed by **MongoDB via Mongoose**.

**User store:** MongoDB `User` model. Seeded with one admin user from env vars on startup — data persists across restarts.

**Auth flow:**
1. Client POSTs to `/auth/login` or `/auth/register`
2. Server validates input, hashes password (register), verifies hash (login)
3. Returns signed JWT (7-day expiry) + user profile
4. Protected routes receive `Authorization: Bearer <token>`

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Health check |
| `POST` | `/auth/login` | No | `{ email, password }` → `{ token, email, displayName, discordUsername }` |
| `POST` | `/auth/register` | No | `{ email, password, displayName }` → `{ token, email, displayName, discordUsername }` |
| `GET` | `/auth/me` | Bearer JWT | Returns authenticated user profile |
| `PUT` | `/auth/profile` | Bearer JWT | Update `discordUsername` |
| `GET` | `/auth/history` | Bearer JWT | List all history entries |
| `POST` | `/auth/history` | Bearer JWT | Save history entry (source: web) |
| `DELETE` | `/auth/history` | Bearer JWT | Delete all history for user |
| `GET` | `/auth/history/stream` | JWT query param | SSE stream — pushes `history:new` events |
| `POST` | `/discord/history` | X-Bot-Secret | Save history entry linked by discordUsername |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `JWT_SECRET` | `raptor-dev-secret-change-in-prod` | JWT signing secret — **change in production** |
| `ADMIN_EMAIL` | `admin@raptor.local` | Pre-seeded admin email |
| `ADMIN_PASSWORD` | `raptor123` | Pre-seeded admin password |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `DISCORD_BOT_SECRET` | `raptor-bot-secret-change-in-prod` | Shared secret for bot→server auth |
| `DB_PATH` | `./data` | MongoDB data directory path |

## Key Conventions

**Multi-file structure.** Entry is `app.js`; routes in `src/routes/`, models in `src/models/`, middleware in `src/middleware/`.

**ESM modules.** `import`/`export` only — never `require`.

**MongoDB persistence.** User data and history persist via Mongoose. Do not reintroduce in-memory state.

**Passwords always hashed.** Use `bcryptjs` — never store or log plain-text passwords.

**Validate at route level.** Check type, format, and length before any business logic.

## Dev Skill (always apply)

Before any code change in this workspace, load and follow the dev skill:
`e:/raptor/.claude/skills/dev/SKILL.md`
