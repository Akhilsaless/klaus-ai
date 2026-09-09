# Reliability Module

The reliability layer is intentionally provider-neutral and lightweight.

- `runtime.ts` contains bounded retries, request IDs, API rate limiting, idempotency protection, and fatal process error handling.
- `health.ts` exposes liveness and database-backed readiness checks.

The in-memory rate-limit and idempotency stores are suitable for a single application instance. When Klaus is scaled horizontally, replace them with a shared store such as Redis while preserving the same middleware contracts.
