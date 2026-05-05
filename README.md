# Raptor Chatbot Server

Authentication and history server for the Raptor Chatbot web frontend. Manages user accounts, JWT sessions, chat history, and exposes a Discord bot integration endpoint.

## Stack

Node.js · ESM · Express · jsonwebtoken · bcryptjs · Mongoose · MongoDB

## Commands

```bash
npm install     # Install dependencies
npm run dev     # Run with auto-restart (node --watch)
npm start       # Run in production
```

Listens on **port 3001** by default.

## Environment variables

Create a `.env` file at the project root (all variables have safe defaults for local development — **change in production**):

```env
PORT=3001
JWT_SECRET=raptor-dev-secret-change-in-prod
ADMIN_EMAIL=admin@raptor.local
ADMIN_PASSWORD=raptor123
CORS_ORIGIN=http://localhost:5173
DB_PATH=./data
DISCORD_BOT_SECRET=raptor-bot-secret-change-in-prod
```

## Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | Health check |
| `POST` | `/auth/register` | No | Register → `{ token, email, displayName, discordUsername }` (`discordUsername` is optional) |
| `POST` | `/auth/login` | No | Login → `{ token, email, displayName, discordUsername }` |
| `GET` | `/auth/me` | Bearer JWT | Returns the authenticated user's profile |
| `PUT` | `/auth/profile` | Bearer JWT | Update `discordUsername` |

### History

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/auth/history` | Bearer JWT | Returns all history entries for the authenticated user |
| `POST` | `/auth/history` | Bearer JWT | Save a new history entry (source: `web`) |
| `PATCH` | `/auth/history/:id/session` | Bearer JWT | Attach or backfill `sessionId` for one history entry |
| `DELETE` | `/auth/history/session/:sessionId` | Bearer JWT | Delete all entries from one chat session |
| `DELETE` | `/auth/history/entry/:id` | Bearer JWT | Delete a single history entry |
| `DELETE` | `/auth/history` | Bearer JWT | Delete all history for the authenticated user |
| `GET` | `/auth/history/stream` | JWT query param | SSE stream — pushes `history:new` events in real time |

### Discord bot integration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/discord/history` | `X-Bot-Secret` header | Returns up to 50 history entries by `discordUsername` (rate-limited to ~20 req/min per IP) |
| `POST` | `/discord/history` | `X-Bot-Secret` header | Save a history entry linked by `discordUsername` (source: `discord`); if no user exists, stores pending history for up to 24h |

## Architecture

Express application. Entry point is `app.js`; routes split under `src/routes/`, models in `src/models/`, middleware in `src/middleware/`.

**Auth flow:**
1. Client sends `POST /auth/register` or `POST /auth/login`
2. Server validates credentials and hashes the password with bcrypt (register only)
3. Returns a signed JWT (7-day expiry)
4. Client stores the token in `sessionStorage` and sends it as `Authorization: Bearer <token>`

**User store:** MongoDB via Mongoose (`User` model). Seeded with one admin user from env vars on startup — data persists across restarts.

**Real-time history:** `GET /auth/history/stream` opens a Server-Sent Events connection. The server pushes a `history:new` event each time a new entry is saved for that user (both from the web and from the Discord bot).

**Pending Discord history:** when the bot sends `POST /discord/history` for a `discordUsername` not yet linked to a user, the server stores a pending entry with a 24-hour TTL. If the user links that Discord username (during register or via `PUT /auth/profile`) before expiration, pending entries are moved into the user's history automatically.

**Session-aware history restore:** web history entries can include a `sessionId`. The frontend uses this to group multiple exchanges in one conversation and restore complete sessions instead of isolated messages.

## Related services

- [`raptor-chatbot`](https://github.com/g-orgo/Discord-bot-studies) — Discord bot that posts to `/discord/history`
- [`raptor-chatbot-web`](https://github.com/g-orgo/Discord-bot-web) — Web frontend that consumes `/auth/*`
