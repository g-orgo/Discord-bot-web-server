# Context

Date: 2026-04-27

## Summary
Hardened duplicate Discord username protection in auth routes by adding explicit case-insensitive pre-checks before register/profile updates.

## Files modified
- `src/routes/auth.js`: added `isDiscordUsernameTaken` helper and integrated checks in register/profile flows.
- `README.md`: updated env var contract and Discord pending history behavior docs.

## Decisions made
- Keep DB unique index as final safeguard, but enforce route-level validation for deterministic API behavior.
- Use collation `{ locale: 'en', strength: 2 }` to align with case-insensitive uniqueness expectations.

## Validation
- `npm test -- --run` passed with all tests green, including duplicate-username conflict scenarios.
