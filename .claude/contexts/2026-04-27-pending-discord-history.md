# Context

Date: 2026-04-27

## Summary
Implemented pre-registration Discord history storage with 24-hour auto-expiration and automatic claim when a user links the same Discord username during register/profile update.

## Files created/modified
- src/models/PendingHistoryEntry.js
  - Added a Mongoose model for pending Discord history entries with TTL on `expiresAt`.
- src/history/pendingDiscordHistory.js
  - Added helper functions to normalize usernames, queue pending entries, and claim entries for a user.
- src/routes/discord.js
  - POST `/discord/history`: now stores pending entries when no user is found.
  - GET `/discord/history`: now returns pending entries for unknown users.
- src/routes/auth.js
  - POST `/auth/register`: now accepts optional `discordUsername` and claims pending history.
  - PUT `/auth/profile`: now claims pending history after linking `discordUsername`.
- src/routes/discord.test.js
  - Added tests for pending history retrieval/storage.
- src/routes/auth.test.js
  - Added tests for claim behavior on register/profile flows.
- README.md
  - Documented optional `discordUsername` on register and pending history behavior.

## Decisions made
- Used a dedicated `PendingHistoryEntry` collection instead of overloading `HistoryEntry` to keep concerns separated and avoid nullable ownership fields.
- TTL set via MongoDB index (`expiresAt` with `expires: 0`) to guarantee auto-drop without cron jobs.
- Claim flow runs both in register (when `discordUsername` is provided) and profile update to support existing UI flows where username may be linked after account creation.

## Known issues or next steps
- Existing accounts that already have pending entries will claim only when they set/update `discordUsername`; no background backfill is implemented.
- If needed, enforce unique index for `User.discordUsername` to fully prevent multi-account claims on the same username.

## Follow-up update (same day)
- Enforced unique `discordUsername` via index with `partialFilterExpression` (string-only) and case-insensitive collation to avoid collisions on `null` while preventing duplicates.
- Added route tests covering duplicate username rejection on both register and profile update.
- Stabilized history route tests by making generated test users deterministic and asserting register token creation in helper.
