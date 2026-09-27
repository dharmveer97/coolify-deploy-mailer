# Configuration

All settings are environment variables. They are validated at startup by
[`src/schemas/env.schema.ts`](../src/schemas/env.schema.ts). If anything is missing or
wrong, the service refuses to start and lists **every** problem at once. It never prints
the values themselves, so secrets can't leak through that message.

Copy [`.env.example`](../.env.example) to `.env` for local development.

## Required

| Variable | Example | Notes |
|---|---|---|
| `WEBHOOK_SECRET` | `3f9c…` (64 chars) | 32+ characters of `A-Z a-z 0-9 - _`. Generate with `npm run secret` or `openssl rand -hex 32`. It becomes part of the webhook URL. |
| `COOLIFY_URL` | `https://coolify.example.com` | Where this service calls the Coolify API (no `/api`). Use `https://`, unless it's an internal Docker hostname such as `http://coolify:8080`. |
| `COOLIFY_API_TOKEN` | `7\|abc…` | **Keys & Tokens → API Tokens**, permission **Read**. Needs API access turned on in **Settings → Advanced**. |
| `SMTP_HOST` | `smtp.postmarkapp.com` | Your email provider's SMTP host |
| `MAIL_FROM` | `Coolify Deployments <deploy@example.com>` | Sender shown in the inbox |
| `MAIL_TO` | `dev@example.com, ops@example.com` | Comma-separated. Recipients come **only** from here, never from a request. |

## Security

| Variable | Default | Notes |
|---|---|---|
| `WEBHOOK_ALLOWED_IPS` | *(empty = any IP)* | Comma-separated IPs or CIDR ranges allowed to call the webhook, e.g. `203.0.113.7, 10.0.0.0/8`. Recommended: your Coolify server's IP. Other callers get the same 404 as a wrong secret. |
| `TRUST_PROXY` | `false` | Set `true` when running behind a reverse proxy (Coolify's Traefik/Caddy), so the real client IP is used for the allowlist and rate limit. Leave `false` otherwise; then a spoofed `X-Forwarded-For` header is ignored. |
| `WEBHOOK_RATE_LIMIT_PER_MINUTE` | `60` | Requests per IP per minute, counted *before* the secret check so guessing is slow |
| `SMTP_REQUIRE_TLS` | `true` | Require STARTTLS before logging in to SMTP. Startup **fails** if `SMTP_PASSWORD` is set but neither this nor `SMTP_SECURE` is on. Only set `false` for a local test server without a password (Mailpit). |

## Coolify

| Variable | Default | Notes |
|---|---|---|
| `COOLIFY_PUBLIC_URL` | `COOLIFY_URL` | The URL your team opens in the browser. Used for the "View deployment logs" button. Set it when `COOLIFY_URL` is an internal address. |
| `COOLIFY_API_TIMEOUT_MS` | `10000` | Timeout for each API call |
| `GIT_BASE_URL` | `https://github.com` | Base for commit links when Coolify stores the repository as `owner/repo` (GitHub App sources). Set it for GitHub Enterprise. |

## SMTP

| Variable | Default | Notes |
|---|---|---|
| `SMTP_PORT` | `587` | `587` = STARTTLS, `465` = implicit TLS |
| `SMTP_SECURE` | `false` | `true` for port 465 |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | *(none)* | Must be set together |

TLS always requires version 1.2 or newer and a valid server certificate.

## Behaviour

| Variable | Default | Notes |
|---|---|---|
| `NOTIFY_ON_SUCCESS` | `true` | Send emails for successful deployments |
| `NOTIFY_ON_FAILURE` | `true` | Send emails for failed deployments |

## Server

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `production` | `development` switches to pretty, coloured logs |
| `PORT` | `3000` | |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |

Booleans accept `true`, `false`, `1` and `0`.

## Startup warnings

The service starts but logs a warning when a setting is only safe on a private network:

- `COOLIFY_URL uses http://` means the API token travels unencrypted.
- `SMTP TLS is off` means emails travel unencrypted.
- `WEBHOOK_ALLOWED_IPS is empty` means any IP with the secret can call the webhook.
