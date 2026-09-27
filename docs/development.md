# Development

## Requirements

- Node.js 24 (see `.nvmrc`; run `nvm use`)
- Docker, for the container and the end-to-end test

## Setup

```bash
npm install                  # also installs the git hooks (husky)
cp .env.example .env         # fill in the values (see configuration.md)
npm run dev                  # starts with reload on save; NODE_ENV=development for pretty logs
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run `src/index.ts` with reload (tsx) |
| `npm run build` | Bundle to `dist/index.mjs` with tsdown |
| `npm start` | Run the bundle |
| `npm run typecheck` | Strict TypeScript check |
| `npm run check` / `npm run fix` | Biome lint + format check, or fix what it can |
| `npm run lint` / `npm run format` | Only lint, or only format |
| `npm test`, `npm run test:watch`, `npm run test:coverage` | Tests ([testing.md](testing.md)) |
| `npm run verify` | Everything CI runs: typecheck, Biome, tests with coverage |
| `npm run email:dev` | React Email preview server on `http://localhost:3030` |
| `npm run email:export` | Export email previews to `out/emails/` |
| `npm run secret` | Print a random `WEBHOOK_SECRET` |
| `npm run docker:build` | Build the Docker image |

## Code style

**One tool: [Biome](https://biomejs.dev)** formats and lints everything; there is no ESLint
or Prettier. The config is `biome.json`, plus a custom GritQL rule in `biome-plugins/`. The
editor settings in `.vscode/` format on save (Antigravity and VS Code). The main rules:

- Put code in the right folder ([architecture.md](architecture.md#architecture-rules-enforced-by-biome)).
- Import with `@/…` (from `src`) and `@test/…` (from `test`), never `../`, and without
  file extensions.
- Write types in `src/types/`, inferred from Zod schemas with `z.output<typeof schema>`
  where possible.
- Put validation in `src/schemas/` (Zod) and `src/validators/`.
- Log with the injected `AppLogger`, never `console`.
- Use named exports only. The one exception is email previews, which the CLI requires to
  be default exports.
- Give exported functions explicit return and parameter types. `any` and `!` are not
  allowed.
- Use kebab-case file names, e.g. `deployment-notifier.ts`.

## Path aliases

`tsconfig.json` defines `@/*` → `src/*` and `@test/*` → `test/*`. They work in:

- TypeScript and your editor (`paths`)
- `npm run dev` (tsx reads `tsconfig.json`)
- Vitest (`resolve.alias` in `vitest.config.ts`)
- The production bundle (tsdown resolves them at build time)

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org). The format is
`type(scope): subject`, for example:

```
feat(emails): show the pull request number for preview deployments
fix(notifier): don't let a rejected webhook block the real one
docs(docs): explain the IP allowlist
```

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
  `chore`, `revert`
- **Scopes:** `api`, `config`, `deps`, `docker`, `docs`, `emails`, `http`, `notifier`,
  `schemas`, `services`, `tests`, `tooling`, `types`, `utils`

Git hooks (husky) run automatically:

| Hook | Runs |
|---|---|
| `pre-commit` | `lint-staged`: Biome fixes staged files, then TypeScript checks the project |
| `commit-msg` | `commitlint` rejects messages that don't follow the format |
| `pre-push` | `npm run verify` |

CI (`.github/workflows/ci.yml`) runs the same checks on every push and PR, lints every
commit message in a PR, and builds and smoke-tests the Docker image.
