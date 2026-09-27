# Logging

The service logs with [pino](https://getpino.io), set up in
[`src/logger/create-logger.ts`](../src/logger/create-logger.ts). `console` is not used
anywhere, and Biome's `noConsole` rule enforces that.

## Why pino (not winston)

| | pino | winston |
|---|---|---|
| Output | One JSON object per line, ready for Docker/Coolify log viewers and collectors (Loki, Datadog, Elastic…) | Needs formats and transports configured |
| Speed | One of the fastest Node.js loggers; logging never slows a request | Noticeably slower |
| Secret redaction | Built in (`redact` paths) | Needs a custom format |
| Express integration | `pino-http` gives every request its own `req.log` with a request id | Needs extra middleware |

## Where logs come from

| Logger | Created in | Used for |
|---|---|---|
| App logger | `createLogger(config)` in `server.ts` | Everything after startup |
| Request logger | `req.log` (pino-http, `middleware/request-logger.ts`) | One line per request, plus anything logged while handling it |
| Deployment logger | `logger.child({ deploymentUuid, event })` in the notifier | Every line about a deployment carries its id |
| Startup logger | `createStartupLogger()` in `index.ts` | Reporting invalid configuration before the app logger exists |

Other code receives the logger as a parameter, typed as `AppLogger` from
`@/types/logger.types`. Only `src/logger/` may import `pino`.

## Format

Production (`NODE_ENV=production`) writes one JSON object per line:

```json
{"level":"info","time":"2026-09-26T16:39:09.768Z","service":"coolify-deploy-mailer","deploymentUuid":"n8iw…","event":"deployment_success","commit":"01223f1","msg":"Deployment email sent"}
```

Development (`NODE_ENV=development`) prints coloured, readable lines through `pino-pretty`.

Set the level with `LOG_LEVEL` (`fatal`, `error`, `warn`, `info`, `debug`, `trace`).

## Redaction

[`src/logger/redaction.ts`](../src/logger/redaction.ts) replaces these with `[REDACTED]`:
`authorization`, `cookie`, `password`, `pass`, `apiToken`, `token`, `secret` and `auth`
fields (one level deep), plus request `Authorization` and `Cookie` headers. The webhook
secret in the URL is replaced separately, and request URLs appear as
`/webhooks/coolify/[REDACTED]`. Tests check both.

## Messages you'll see

| Level | Message | Meaning |
|---|---|---|
| info | `coolify-deploy-mailer listening` | Server started |
| info | `SMTP connection OK` | SMTP login worked at startup |
| warn | `SMTP check failed; emails will be retried` | SMTP not reachable at startup |
| warn | `COOLIFY_URL uses http://…`, `SMTP TLS is off…` | Settings that are only safe on a private network |
| info | `WEBHOOK_ALLOWED_IPS is empty…` | No IP allowlist configured |
| info | `Received Coolify test webhook` | The "Send Test" button in Coolify |
| info | `Deployment webhook accepted` | `status`: `queued`, `duplicate` or `disabled` |
| warn | `Webhook rejected: not sending an email` | `reason`: `deployment-not-found`, `application-mismatch`, `status-mismatch` or `coolify-unreachable` |
| warn | `Blocked webhook from an IP that is not allowed` | Caller outside `WEBHOOK_ALLOWED_IPS` |
| warn | `Rejected invalid webhook payload` | Body failed validation; `issues` lists why |
| warn | `Coolify API call failed, retrying` / `Sending email failed, retrying` | Temporary problem; retried with backoff |
| info | `Deployment email sent` | Done; includes `commit` |
| error | `Failed to send deployment email` | All retries failed; a redelivery can try again |
| error | `Unhandled error` | Bug; the caller got a generic 500 |
| fatal | `Invalid configuration: …` | Startup stopped; the message lists every problem |
