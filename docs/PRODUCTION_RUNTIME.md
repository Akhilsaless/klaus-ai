# Klaus Production Runtime Gates

This document defines the minimum runtime gates before Klaus can be called production-ready.

## Already enforced in code

- Request correlation IDs on every request.
- API rate limiting with configurable window and request ceiling.
- Idempotency-key protection for mutating API requests.
- Separate liveness and database-backed readiness probes.
- Retry helper with bounded exponential backoff.
- Graceful SIGTERM/SIGINT shutdown with a hard timeout.
- Fatal uncaught error handling.
- Existing CI requires typecheck, tests, and production build before merge.

## Required environment controls

- `DATABASE_URL`
- `PORT`
- `API_RATE_LIMIT_WINDOW_MS` (optional; defaults to 60000)
- `API_RATE_LIMIT_MAX` (optional; defaults to 180)
- `IDEMPOTENCY_TTL_MS` (optional; defaults to 600000)

## Remaining deployment gates

These require an actual production environment/provider and must not be simulated in the web app:

1. Apply all database migrations to the production database.
2. Configure encrypted production secrets and provider credentials.
3. Wire the real cloud/browser/desktop runtime adapters.
4. Configure monitoring, alerting, centralized logs, and uptime checks against `/api/health/live` and `/api/health/ready`.
5. Configure backups and verify restore procedures.
6. Run end-to-end tests against the deployed environment.
7. Run security testing for auth/RBAC, prompt injection, secrets exposure, SSRF/tool abuse, and approval bypasses.
8. Run load tests and tune rate limits/worker concurrency.
9. Verify kill-switch, session revocation, device revocation, and agent stop behavior under failure.
10. Only then mark the release production-ready.
