# raptor-chatbot-server

Simple authentication server for the Raptor Chatbot web frontend.

## Stack

Node.js ESM · Express · jsonwebtoken · bcryptjs

## Run

```bash
npm install
npm run dev   # node --watch (auto-restart)
npm start     # production
```

Listens on **port 3001** by default.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `JWT_SECRET` | `raptor-dev-secret-change-in-prod` | Secret used to sign JWTs — **change in production** |
| `ADMIN_EMAIL` | `admin@raptor.local` | Default admin login |
| `ADMIN_PASSWORD` | `raptor123` | Default admin password |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Health check |
| `POST` | `/auth/login` | No | Login with `{ email, password }` → `{ token, displayName, email }` |
| `GET` | `/auth/me` | Bearer JWT | Returns the authenticated user's profile |
