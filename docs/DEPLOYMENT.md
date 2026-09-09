# Klaus deployment

Klaus now ships with a production Docker image and a Render blueprint. GitHub `main` remains the source of truth.

## Required deployment inputs

Set these as platform secrets/environment variables before first production deploy:

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `OWNER_OPEN_ID`
- `ALLOWED_ORIGINS`
- `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` for the default/free provider path when supplied by the runtime
- `OPENAI_API_KEY` only if the optional advanced provider is enabled

External computer, desktop and voice runtime variables should stay empty until those real runtimes are deployed and health-checked.

## Deployment sequence

1. Create a production MySQL database compatible with the existing Drizzle schema.
2. Inject secrets through the hosting provider; never commit them.
3. Apply the repository migrations against that database.
4. Deploy the Docker image. The application binds to the hosting provider's exact `PORT` on `0.0.0.0`.
5. Verify `/api/health/live` returns HTTP 200.
6. Verify `/api/health/ready` returns HTTP 200 and reports the database as ready.
7. Verify authentication, owner/super-admin access, free-first AI routing, task execution and audit events.
8. Only mark external computer/mobile/voice features connected after their corresponding runtime health checks succeed.

## Render

`render.yaml` is included as a blueprint. Secret values are intentionally `sync: false` and must be supplied in Render. The health check uses `/api/health/live`; operational readiness should additionally be monitored through `/api/health/ready`.

## Container

Build locally with:

```sh
docker build -t klaus-ai .
```

Run with a real environment file:

```sh
docker run --rm -p 3000:3000 --env-file .env.production klaus-ai
```

Do not commit `.env.production`.

## Production boundary

Deploying the web control plane does not by itself deploy the cloud computer, desktop companion, Android/iOS companion, local wake-word runtime, or realtime voice transport. Klaus must continue showing those capabilities as unavailable until real adapters are connected.
