# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot, …) and for people
working on this repository. Read this before changing code.

## What this project is

A small Express 5 + TypeScript service. It receives Coolify's deployment webhooks,
**verifies** each one against the Coolify API, and emails the team which commit was
deployed. The architecture is explained in [docs/architecture.md](docs/architecture.md).

## Commands

```bash
npm install            # install deps and git hooks
npm run dev            # run locally (needs .env; see docs/configuration.md)
npm run verify         # typecheck + Biome + tests with coverage — must pass before you finish
npm test -- <path>     # run some tests
npm run fix            # auto-fix formatting and lint issues
npm run email:dev      # preview email templates at http://localhost:3030
npm run build          # bundle to dist/index.mjs
```

Always run `npm run verify` after a change and report the result honestly.

## Where code goes

Biome enforces these rules, so breaking one fails `npm run check`.

| You are writing… | Put it in | Rules |
|---|---|---|
| A Zod schema | `src/schemas/<name>.schema.ts` | Only place that builds schemas |
| A type or interface | `src/types/<area>.types.ts` | **Only** place for `type`/`interface`; infer from schemas with `z.output<typeof schema>` |
| Parsing input with a schema | `src/validators/` | Return a typed result; don't throw for bad input |
| Business logic | `src/services/` | No Express, no React; receive the logger and dependencies as parameters |
| Express middleware or routes | `src/middleware/`, `src/routes/` | Only place for `express` imports |
| Email UI | `src/emails/` | Only place for `react`/`react-email`; see [docs/email-templates.md](docs/email-templates.md) |
| Small pure helpers | `src/utils/` | No I/O |
| Constants | `src/constants/` | |
| Errors | `src/errors/` | Classes extending `Error` with a `name` |
| Logging setup | `src/logger/` | Only place that imports `pino`; others use `AppLogger` |
| Tests | `test/unit/<src folder>/`, `test/integration/`, `test/security/` | See [docs/testing.md](docs/testing.md) |

## Code conventions

- Import with `@/…` (src) and `@test/…` (test). Never use `../`, and leave out file
  extensions.
- Named exports only. The exception is `src/emails/previews/`, whose files need a default
  export.
- Give exported functions explicit types. No `any`, no non-null `!`, no `console`.
- Use kebab-case file names. Keep functions small; Biome limits cognitive complexity to 12.
- Add a short JSDoc comment to exported functions that explains *why*, not *what*.
- Handle every promise (`await`, `.catch`, or return it). Floating promises are lint errors.

## Security rules (do not weaken)

These are covered by `test/security/`. Changing one needs a very good reason and matching
tests. The reasons are in [docs/security.md](docs/security.md).

1. Never build email content (names, links, commit) from the webhook body. Use the
   **verified** Coolify API response (`services/deployment-verifier.ts`,
   `services/deployment-email-data.ts`).
2. Fail closed: if a webhook can't be verified, send no email.
3. Only a successfully sent email marks a deployment as done in the dedupe cache.
4. Keep the secret comparison constant-time, and keep the `404` for a wrong secret or a
   blocked IP.
5. Never log, return or throw secrets (`WEBHOOK_SECRET`, `COOLIFY_API_TOKEN`,
   `SMTP_PASSWORD`). Add new sensitive field names to `src/logger/redaction.ts`.
6. Recipients come only from `MAIL_TO`.
7. Links in emails go through `toSafeHref()` / `coolifyLink()`.
8. Keep `SMTP_REQUIRE_TLS` defaulting to `true`.

## Git

- Commit messages: Conventional Commits with an allowed scope (see
  [docs/development.md](docs/development.md#commits)). `commitlint` checks this.
- Don't commit `.env`, `dist/`, `coverage/` or `out/`.
- **Agents:** don't commit, push or create repositories unless the maintainer explicitly
  asks. Don't add AI attribution trailers to commits.

## Definition of done

- [ ] Code is in the right folder, and `npm run check` passes
- [ ] Tests are added or updated (security-related changes → `test/security/`)
- [ ] `npm run verify` passes, with coverage above the thresholds
- [ ] Docs are updated if behaviour or configuration changed (`docs/`, `.env.example`)
