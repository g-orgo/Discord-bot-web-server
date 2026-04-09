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
MONGODB_URI=mongodb://localhost:27017/raptor
BOT_SECRET=raptor-bot-secret-change-in-prod
```

## Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | No | Health check |
| `POST` | `/auth/register` | No | Register → `{ token, email, displayName, discordUsername }` |
| `POST` | `/auth/login` | No | Login → `{ token, email, displayName, discordUsername }` |
| `GET` | `/auth/me` | Bearer JWT | Returns the authenticated user's profile |
| `PUT` | `/auth/profile` | Bearer JWT | Update `discordUsername` |

### History

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/auth/history` | Bearer JWT | Returns all history entries for the authenticated user |
| `POST` | `/auth/history` | Bearer JWT | Save a new history entry (source: `web`) |
| `DELETE` | `/auth/history` | Bearer JWT | Delete all history for the authenticated user |
| `GET` | `/auth/history/stream` | JWT query param | SSE stream — pushes `history:new` events in real time |

### Discord bot integration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/discord/history` | `X-Bot-Secret` header | Save a history entry linked by `discordUsername` (source: `discord`) |

## Architecture

Express application. Entry point is `app.js`; routes split under `src/routes/`, models in `src/models/`, middleware in `src/middleware/`.

**Auth flow:**
1. Client sends `POST /auth/register` or `POST /auth/login`
2. Server validates credentials and hashes the password with bcrypt (register only)
3. Returns a signed JWT (7-day expiry)
4. Client stores the token in `sessionStorage` and sends it as `Authorization: Bearer <token>`

**User store:** MongoDB via Mongoose (`User` model). Seeded with one admin user from env vars on startup — data persists across restarts.

**Real-time history:** `GET /auth/history/stream` opens a Server-Sent Events connection. The server pushes a `history:new` event each time a new entry is saved for that user (both from the web and from the Discord bot).

## Related services

- [`raptor-chatbot`](https://github.com/g-orgo/Discord-bot-studies) — Discord bot that posts to `/discord/history`
- [`raptor-chatbot-web`](https://github.com/g-orgo/Discord-bot-web) — Web frontend that consumes `/auth/*`
