import { type Logger, type LoggerOptions, pino } from 'pino';
import { REDACTED_PATHS } from '@/logger/redaction';
import type { LoggerSettings } from '@/types/logger.types';

const SERVICE_NAME = 'coolify-deploy-mailer';

/**
 * The application logger (pino): one JSON object per line in production — easy for Docker,
 * Coolify and log collectors to parse — and colourful, readable lines in development.
 * Secrets are redacted before anything is written.
 */
export function createLogger(settings: LoggerSettings): Logger {
  return pino(loggerOptions(settings));
}

/**
 * Logger for the moments before the configuration is loaded (e.g. to report that it is invalid).
 * Always JSON at "info" level.
 */
export function createStartupLogger(): Logger {
  return pino(loggerOptions({ env: 'production', logLevel: 'info' }));
}

function loggerOptions(settings: LoggerSettings): LoggerOptions {
  return {
    level: settings.logLevel,
    base: { service: SERVICE_NAME },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
    formatters: {
      level: (label: string): { level: string } => ({ level: label }),
    },
    ...(settings.env === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss' },
          },
        }
      : {}),
  };
}
