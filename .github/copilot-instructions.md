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

Single-file Express application (`app.js`).

**User store:** In-memory `USERS` array, pre-seeded from env vars. All data is lost on restart — no persistence.

**Auth flow:**
1. Client POSTs to `/auth/login` or `/auth/register`
2. Server validates input, hashes password (register), verifies hash (login)
3. Returns signed JWT (7-day expiry) + user profile
4. Protected routes receive `Authorization: Bearer <token>`

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Health check |
| `POST` | `/auth/login` | No | `{ email, password }` → `{ token, email, displayName }` |
| `POST` | `/auth/register` | No | `{ email, password, displayName }` → `{ token, email, displayName }` |
| `GET` | `/auth/me` | Bearer JWT | Returns authenticated user profile |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `JWT_SECRET` | `raptor-dev-secret-change-in-prod` | JWT signing secret — **change in production** |
| `ADMIN_EMAIL` | `admin@raptor.local` | Pre-seeded admin email |
| `ADMIN_PASSWORD` | `raptor123` | Pre-seeded admin password |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

## Key Conventions

**Single-file app.** Keep all logic in `app.js` unless explicitly asked to split.

**ESM modules.** `import`/`export` only — never `require`.

**In-memory store.** `USERS` resets on restart — do not introduce persistence without discussion.

**Passwords always hashed.** Use `bcryptjs` — never store or log plain-text passwords.

**Validate at route level.** Check type, format, and length before any business logic.

## Dev Skill (always apply)

Before any code change in this workspace, load and follow the dev skill:
`e:/raptor/.claude/skills/dev/SKILL.md`
