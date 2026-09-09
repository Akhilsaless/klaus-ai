# Klaus Phase 1 — Production Foundation

## Goal
Turn the existing autonomous-agent prototype into a provider-neutral, auditable production foundation without pretending that browser/desktop/mobile control already exists.

## Implemented in this phase

- Free-first AI model routing.
- Optional OpenAI advanced provider through the Responses API.
- Advanced-only routing classes for complex planning, critical verification, computer-use and premium voice paths.
- Automatic fallback from OpenAI to the free provider.
- In-memory provider circuit breaker and health reporting.
- Backward-compatible `askClaude` facade so the existing planner/executor/tool code does not need a destructive rewrite.
- Planner classified as advanced planning; final summary remains free/routine.
- Verifier classified as critical verification.
- Expanded RBAC roles: user, reviewer, manager, admin, super_admin.
- Owner account promoted to `super_admin` on upsert when `OWNER_OPEN_ID` matches.
- Super-admin-only procedures for AI provider metadata, provider health and audit events.
- Provider configuration metadata table. API keys are not persisted in application tables.
- Security/product audit event table.
- GitHub CI gate for typecheck, tests and production build.
- `.env.example` documenting the free-first and optional-OpenAI configuration.

## Security decisions

1. Provider secrets stay in environment/secret-management infrastructure. The database stores only an optional secret reference and non-secret provider metadata.
2. OpenAI is optional. Missing OpenAI credentials must never prevent routine Klaus operation.
3. Provider failure causes fallback rather than silently failing the whole task when a free fallback can complete it.
4. Super Admin is the only role allowed to edit model/provider configuration metadata.
5. Audit records intentionally do not contain API keys.

## Execution architecture boundary

Klaus web remains the control plane. Future execution adapters must be separate services/modules:

- cloud browser/computer runtime
- desktop companion
- browser extension/automation runtime
- Android companion
- constrained iOS companion
- voice/wake runtime

The control plane must show real execution state from these runtimes; it must never fake a mini-computer for API-only jobs.

## Database migration

Apply `drizzle/0002_klaus_phase1_foundation.sql` before relying on the new roles/provider/audit endpoints.

## Phase 1 completion gates

- CI passes typecheck.
- Existing agent tests pass.
- Production build passes.
- Migration reviewed/applied in a safe environment.
- Routine tasks work without `OPENAI_API_KEY`.
- Advanced task falls back to free provider when OpenAI is unavailable.
- Super-admin provider endpoints reject non-super-admin users.

## Deferred intentionally

The following belong to later phases and should not be mocked as completed:

- Teach Klaus / Shadow Mode
- workflow graph and learned Skills
- persistent operational memory redesign
- cloud Agent Computer
- desktop/mobile device control
- wake word and custom voice
- self-healing visual workflows
- full secrets vault integration
- distributed job queue and worker fleet
- cross-device handoff
