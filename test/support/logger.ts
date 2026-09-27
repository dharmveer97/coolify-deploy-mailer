import { type LevelWithSilent, type Logger, pino } from 'pino';

export const silentLogger: Logger = pino({ level: 'silent' });

/** A logger that keeps every JSON log line so tests can inspect them. */
export function captureLogger(level: LevelWithSilent = 'trace'): {
  logger: Logger;
  lines: string[];
} {
  const lines: string[] = [];
  const logger = pino({ level }, { write: (line: string) => lines.push(line) });
  return { logger, lines };
}
