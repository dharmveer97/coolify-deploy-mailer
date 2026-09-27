# Architecture

## What problem it solves

Coolify's deployment emails say *"application X was deployed"* but not **which commit**.
Coolify can call a webhook on every deployment, but that webhook has no commit data either.
This service receives the webhook, asks the Coolify API for the details, and emails them.

## Request lifecycle

```
 Coolify
   │  POST /webhooks/coolify/<secret>   { event, application_uuid, deployment_uuid, … }
   ▼
 ┌──────────────────────── HTTP layer (src/app.ts, routes/, middleware/) ────────────────────────┐
 │ helmet → request log (secret redacted) → JSON body ≤ 32 kB                                     │
 │ → rate limit → IP allowlist → secret check (constant time) → Content-Type check                │
 │ → validators/parse-webhook-payload.ts (Zod)                                                    │
 │      test event → 200     other event → 202 "ignored"     invalid → 400     deployment → ▼     │
 └────────────────────────────────────────────────────────────────────────────────────────────────┘
   │  202 "queued" returned immediately; the rest runs in the background
   ▼
 services/deployment-notifier.ts
   1. dedupe (same event + deployment within 24 h → "duplicate")
   2. services/deployment-verifier.ts ──► Coolify API  GET /api/v1/deployments/{uuid}
        must exist, belong to the same application, and have status finished / failed
                                     ──► Coolify API  GET /api/v1/applications/{uuid}
      anything wrong → WebhookRejectedError → logged, no email
   3. services/deployment-email-data.ts  build the email data from the API response
   4. emails/render-deployment-email.tsx  React Email → HTML  +  plain-text template
   5. services/smtp-mailer.ts  nodemailer over TLS, retried 4× with backoff
```

**Why verify with the API?** Coolify's webhooks aren't signed. If the secret URL ever
leaked, someone could otherwise send your team fake emails with phishing links. Because
every email is built from Coolify's own data, a forged webhook can at most re-announce a
real deployment. Details are in [security.md](security.md).

## Folder structure

Each folder has one job. Biome enforces the boundaries (see the table below), so a type,
schema or import in the wrong place fails `npm run check`.

```
src/
  index.ts                  entry point: load config, start server, log fatal errors
  server.ts                 wires services together; graceful shutdown on SIGTERM/SIGINT
  app.ts                    Express app: middleware order, routes, error handling
  config/load-config.ts     environment variables → typed Config
  constants/                limits, timings, route paths
  errors/                   ConfigError, CoolifyApiError, WebhookRejectedError
  logger/                   pino logger factory and redaction list
  schemas/                  every Zod schema (env, webhook payload, Coolify API)
  types/                    every type and interface, inferred from schemas with z.output<>
  validators/               raw input + schema → typed result
  services/                 Coolify client, verifier, email data, notifier, SMTP mailer
  middleware/               secret, IP allowlist, JSON, rate limit, request log, errors
  routes/                   /health and the webhook route
  emails/
    components/             EmailLayout, DetailTable, CommitMessage, ActionLinks
    templates/              DeploymentEmail (HTML) and the plain-text template
    previews/               sample emails for the `npm run email:dev` preview server
    deployment-email-content.ts   subject, heading, rows and links shared by both templates
    render-deployment-email.tsx   → { subject, html, text }
    tailwind-config.ts      colours and fonts for the Tailwind component
  utils/                    small pure functions: git links, text, URLs, retry, secrets, IPs
test/
  unit/                     one folder per src folder
  integration/              HTTP app, real SMTP server, the whole service as a process
  security/                 attacks on the webhook
  support/                  fixtures, fakes, capture logger, SMTP and fake Coolify servers
biome-plugins/              custom GritQL lint rule (types only in src/types/)
docs/                       these guides
```

## Architecture rules (enforced by Biome)

| Rule | Why |
|---|---|
| Types and interfaces only in `src/types/` (GritQL plugin) | One place to find every shape; most are inferred from Zod |
| `zod` only in `schemas/` and `types/` | Validation logic stays in one layer |
| `react` / `react-email` only in `emails/` | Templates are isolated from business logic |
| `express` only in `app.ts`, `routes/`, `middleware/` | Services stay framework-free and easy to test |
| `nodemailer` only in `services/smtp-mailer.ts` | Swapping the email provider touches one file |
| `pino` only in `logger/` (others use the `AppLogger` type) | One logger configuration, one redaction list |
| Imports use `@/…` (src) and `@test/…` (test), never `../` | Moving a file doesn't break a chain of relative paths |
| No `console`, no `any`, no `!`, no default exports, no import cycles | Consistency and type safety |
| Explicit types on exported functions, no floating promises | Unhandled promises are a common source of lost emails |

## Key design decisions

| Decision | Reason |
|---|---|
| Answer 202 before sending | Coolify doesn't wait long; slow SMTP never delays or fails the webhook |
| Build email content from the API, not the webhook | Webhooks aren't signed; the API is authenticated |
| Fail closed when Coolify can't be reached | Better no email than an unverified one; a redelivery can retry |
| Only a *sent* email marks a deployment as done | A rejected fake can't block the genuine webhook |
| In-memory dedupe (LRU, 24 h) | Coolify retries webhooks; no database needed for one instance |
| React Email + Tailwind for HTML, hand-written plain text | Readable components, email-client-safe output; React Email's automatic plain text merges table cells |
| tsdown bundle for production | Resolves `@/` aliases and produces one file for `node dist/index.mjs` |
| Docker instead of PM2 | Docker/Coolify restart the container and run its health check |
