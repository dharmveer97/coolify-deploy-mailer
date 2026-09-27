# Security

This page explains what the service protects, how, and how each protection is tested. To
report a vulnerability, see [../SECURITY.md](../SECURITY.md).

## What we protect

| Asset | Where it lives |
|---|---|
| SMTP password | `SMTP_PASSWORD` environment variable |
| Coolify API token | `COOLIFY_API_TOKEN` environment variable |
| Webhook secret | `WEBHOOK_SECRET`, and inside the webhook URL stored in Coolify |
| Your team's inbox | `MAIL_TO` |
| Deployment details (commits, repositories) | Fetched from Coolify on demand; never stored |

## Threats and protections

| # | Threat | Protection | Tested in |
|---|---|---|---|
| 1 | Someone finds the endpoint and guesses the secret | 32+ character secret; constant-time comparison; wrong secret → same `404` as an unknown route; rate limit applies before the check | `test/security/webhook-attacks.test.ts` → *without the secret* |
| 2 | Requests from anywhere on the internet | Optional `WEBHOOK_ALLOWED_IPS` (IPs/CIDRs). Behind a proxy, `TRUST_PROXY=true` uses the real IP; without it a spoofed `X-Forwarded-For` is ignored | *IP allowlist* tests |
| 3 | **Secret leaked**: forged webhook for a deployment that doesn't exist | Every webhook is verified with the Coolify API; unknown deployment → rejected, no email | *with a leaked secret* tests |
| 4 | Leaked secret: real deployment claimed for another app, or a failed one claimed as a success | The verifier checks the application UUID and the status | same |
| 5 | Leaked secret: phishing links or text in the webhook body | The email's name, links and commit come from the Coolify API, not the body. Links must be `http(s)`; deployment links must be paths on `COOLIFY_PUBLIC_URL` | *phishing links* test, `deployment-email-data.test.ts` |
| 6 | Leaked secret: a bad webhook sent first to block the real one | Only a *sent* email marks a deployment as done; rejections never block later deliveries | *a rejected fake cannot block…* test (this bug was found and fixed during live testing) |
| 7 | Leaked secret: flooding the team with emails | Duplicate detection (24 h), rate limiting, and emails only for verified deployments | *replaying a real webhook* test |
| 8 | Leaked secret: sending email to other people | Recipients come only from `MAIL_TO`; extra fields in the body are ignored | *recipient list* test |
| 9 | HTML or script injection through commit messages or branch names | React escapes all text; Zod limits lengths; subjects are forced to one line | `deployment-email.test.ts` |
| 10 | SSRF or path traversal through IDs in the webhook | IDs must match `[A-Za-z0-9_-]{1,64}` and are URL-encoded; the API host is fixed by config | *path traversal* test |
| 11 | SMTP password stolen in transit | `SMTP_REQUIRE_TLS` (default on): STARTTLS before login, TLS ≥ 1.2, valid certificate. Startup refuses a password without TLS | `smtp-mailer.test.ts` → *refuses to authenticate over plain text* |
| 12 | Credentials in logs, errors or responses | pino redaction (`src/logger/redaction.ts`); responses contain only a status; config errors never print values | `create-logger.test.ts`, *never exposes the password*, `process.test.ts` |
| 13 | Crashes that reveal internals | Unknown errors → generic `500 Internal server error`; details only in logs | *hides internal errors* test |
| 14 | Oversized or malformed requests | 32 kB body limit, JSON only, strict schemas | `http-app.test.ts` |
| 15 | Compromised container | Non-root user, read-only filesystem, all Linux capabilities dropped, `no-new-privileges` | `docs/deployment.md` run flags |
| 16 | Vulnerable dependencies | `npm audit` (0 known vulnerabilities at the time of writing); CI runs on every PR | `npm audit --registry=https://registry.npmjs.org` |

## What an attacker *can* do with a leaked secret

- Re-send a **real** deployment's notification once. It is verified and built from
  Coolify's data, so the email is genuine, and further repeats are ignored as duplicates.
- Make the service call the Coolify API (read-only, rate limited).

They **cannot** read anything (responses are only `{"status": …}`), change who receives
emails, put their own links or text in an email, or make the service contact another
host.

## Recommended production setup

1. Serve the webhook over **HTTPS** only.
2. Set `WEBHOOK_ALLOWED_IPS` to your Coolify server's IP, plus `TRUST_PROXY=true` behind a
   proxy.
3. Give the Coolify token **Read** permission only.
4. Keep `SMTP_REQUIRE_TLS=true`, or use port 465 with `SMTP_SECURE=true`.
5. Mark `WEBHOOK_SECRET`, `COOLIFY_API_TOKEN` and `SMTP_PASSWORD` as secrets in Coolify.
6. Rotate the webhook secret and API token if you suspect a leak. See
   [deployment.md](deployment.md#b4-security-checklist).

## Running the security checks

```bash
npm test -- test/security            # attack scenarios
npm test -- test/integration         # SMTP TLS, password leaks, full process
npm audit --registry=https://registry.npmjs.org
```
