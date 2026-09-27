# Contributing

Thanks for helping! This guide gets you from zero to a merged pull request.

## 1. Set up

```bash
git clone <this repository> && cd coolify-deploy-mailer
nvm use                      # Node.js 24
npm install                  # installs dependencies and git hooks
cp .env.example .env         # only needed for `npm run dev`
npm run verify               # should pass before you change anything
```

## 2. Make your change

- Read [AGENTS.md](AGENTS.md) for where code goes and the rules Biome enforces. It's short.
- [docs/architecture.md](docs/architecture.md) explains how a webhook becomes an email.
- For email changes, use `npm run email:dev` ([docs/email-templates.md](docs/email-templates.md)).
- Add or update tests ([docs/testing.md](docs/testing.md)). Security-related changes need
  a case in `test/security/`.
- If you add or change an environment variable, update `src/schemas/env.schema.ts`,
  `.env.example` and [docs/configuration.md](docs/configuration.md).

## 3. Check it

```bash
npm run fix       # format and auto-fix
npm run verify    # typecheck + Biome + tests with coverage
```

## 4. Commit

Commits follow [Conventional Commits](https://www.conventionalcommits.org), which the
`commit-msg` hook checks:

```
feat(emails): show the pull request number for preview deployments
fix(http): return 415 for multipart bodies
```

Allowed scopes: `api config deps docker docs emails http notifier schemas services tests
tooling types utils`. Keep each commit to one logical change.

## 5. Open a pull request

- Branch from `main` (`feat/…`, `fix/…`, `docs/…`).
- Describe **what** changed and **why**, and how you tested it.
- CI must be green.

## Reporting bugs and security issues

- Bugs: open an issue with steps to reproduce and the relevant log lines. Remove secrets
  first.
- Security issues: **don't** open a public issue. See [SECURITY.md](SECURITY.md).
