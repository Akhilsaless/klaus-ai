# Klaus Production Release Gates

Klaus is not considered production-finished until every applicable gate below is verified against the deployment environment.

## Application
- `pnpm check`, `pnpm test`, and `pnpm build` pass.
- Database migrations are applied to the target database and `/health/ready` reports ready.
- `JWT_SECRET`, OAuth configuration and owner identity are injected from the deployment secret store.
- `ALLOWED_ORIGINS` contains only the deployed trusted web origins.
- Rate limits, request body limits and idempotency settings are configured for expected traffic.

## AI brain
- At least one free/default model path is healthy.
- OpenAI remains optional and is enabled only when a valid advanced-provider secret is configured.
- Fallback behavior, provider health and usage telemetry are verified.
- No raw provider keys are stored in application database records.

## Agents and safety
- Planner → executor → verifier flow is tested end-to-end.
- High-risk, financial, destructive and credential-access actions are approval-gated.
- Audit events are retained according to policy.
- A stop/kill path is tested for every connected execution runtime.

## Teach Klaus / Shadow Mode
- Recording is explicit and visible to the user.
- Sensitive values are excluded/redacted from learned workflow events.
- A learned workflow requires user review before becoming an executable Skill.
- Memory can be inspected, disabled and deleted by the owning user.

## Agent Computer and external runtimes
- A visual runtime is shown as connected only after its adapter health check succeeds.
- Pause, stop, takeover and return-control are tested against the real runtime.
- Session isolation and credential boundaries are verified.
- Prompt-injection tests are run against browser content before enabling autonomous external side effects.

## Desktop/mobile/voice
- Desktop and mobile companions are signed, permission-scoped and revocable before release.
- Android wake/screen features use explicit platform permissions and visible disclosure.
- iOS capabilities remain constrained to supported APIs; no unrestricted background-control claim is made.
- Wake detection is local where supported.
- Custom voice creation requires explicit consent evidence and provider entitlement.

## Operations
- HTTPS is mandatory in production.
- Logs do not contain secrets, tokens or captured credentials.
- Backups and restore procedures are tested.
- Alerts exist for readiness failures, elevated 5xx rate, provider failures and runtime disconnects.
- A rollback procedure is documented and tested.

Passing CI proves the repository builds and tests cleanly; it does not by itself prove the external runtime, mobile/desktop binaries or production infrastructure are deployed.
