import type { Logger } from 'pino';
import type { Config } from '@/types/config.types';

/** What the logger needs from the configuration. */
export type LoggerSettings = Pick<Config, 'env' | 'logLevel'>;

/** The logger passed around the app. Created only in src/logger/. */
export type AppLogger = Logger;
