# Testing

Tests use [Vitest](https://vitest.dev) and [Supertest](https://github.com/ladjs/supertest).
Coverage must stay at or above 95% lines/statements/functions and 90% branches, and
`npm run test:coverage` fails below that.

## Commands

```bash
npm test                     # all tests once
npm run test:watch           # re-run on save
npm run test:coverage        # with coverage report (HTML in coverage/)
npm test -- test/security    # one folder
npm test -- -t "phishing"    # tests whose name matches
npm run verify               # typecheck + Biome + tests with coverage (same as CI and pre-push)
```

## Layout

| Folder | What it tests | Real or fake |
|---|---|---|
| `test/unit/<src folder>/` | One module at a time: config, validators, utils, emails, services, logger | Fakes for the Coolify API and SMTP |
| `test/integration/http-app.test.ts` | The Express app over HTTP: status codes, headers, limits | Real HTTP (Supertest), fake notifier dependencies |
| `test/integration/smtp-mailer.test.ts` | Sending real emails, SMTP login, TLS enforcement, password leaks | Real in-process SMTP server (`smtp-server`) |
| `test/integration/process.test.ts` | The whole service started with `node`, a webhook, the email, and `SIGTERM` shutdown | Real process, real SMTP server, fake Coolify HTTP server |
| `test/security/` | Attacks: forged webhooks, phishing links, blocking, replay, IP allowlist, secret guessing | Real app + notifier, fake Coolify API |

Shared helpers live in `test/support/`:

| File | Provides |
|---|---|
| `fixtures.ts` | `SECRET`, `SHA`, `deploymentPayload()`, `validEnv` |
| `fakes.ts` | `FakeMailer`, `fakeCoolify()`, `createTestNotifier()` |
| `logger.ts` | `silentLogger`, `captureLogger()` to assert on log lines |
| `smtp-server.ts` | `startSmtpServer()`, a real SMTP server that records messages and login attempts |
| `fake-coolify-server.ts` | `startFakeCoolifyServer()`, a real HTTP server answering the two API calls |
| `wait-for.ts` | `waitFor()`, `freePort()` |

## Writing a test

- Put it next to the code it tests: `src/utils/url.ts` → `test/unit/utils/…`.
- Import with aliases: `@/utils/url` and `@test/support/fixtures`.
- Use `createTestNotifier({ coolify: fakeCoolify({ status: 'failed' }) })` to change what the
  "Coolify API" returns.
- After `notifier.accept(...)`, `await notifier.drain()` before checking `mailer.sent`.
- For anything security-related, add a case to `test/security/`.

## End-to-end test with a real Coolify (manual)

This checks the whole chain: Coolify → webhook → mailer → Coolify API → email.

1. Start Coolify's dev environment from the Coolify repository (`./scripts/dev start`). It
   includes Mailpit (`http://localhost:8025`).
2. In Coolify: turn on **API access**, create a **Read** token, and add
   `coolify-deploy-mailer` under **Settings → Advanced → Allowed internal targets**.
3. Create `.env` with `COOLIFY_URL=http://coolify:8080`,
   `COOLIFY_PUBLIC_URL=http://localhost:8000`, `SMTP_HOST=mailpit`, `SMTP_PORT=1025` and
   `SMTP_REQUIRE_TLS=false`.
4. Build and run the container on Coolify's network:

   ```bash
   docker build -t coolify-deploy-mailer .
   docker run -d --name coolify-deploy-mailer --network coolify-dev-main --env-file .env \
     -p 3000:3000 --read-only --cap-drop ALL --security-opt no-new-privileges:true \
     coolify-deploy-mailer
   ```

5. In **Notifications → Webhook**, set
   `http://coolify-deploy-mailer:3000/webhooks/coolify/<secret>`, enable it, tick both
   deployment events, and click **Send Test**.
6. Deploy an app, then check Mailpit. Try a failing deployment too.
7. Try the attacks from [security.md](security.md) with `curl`. Nothing should reach Mailpit.

See [deployment.md](deployment.md#appendix-local-test-with-mailpit) for the scenarios that
were run.
