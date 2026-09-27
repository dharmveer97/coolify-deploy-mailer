import { loadConfig } from '@/config/load-config';
import { ConfigError } from '@/errors/config-error';
import { createStartupLogger } from '@/logger/create-logger';
import { startServer } from '@/server';

try {
  startServer(loadConfig());
} catch (error: unknown) {
  const logger = createStartupLogger();
  if (error instanceof ConfigError) {
    logger.fatal(error.message);
  } else {
    logger.fatal({ err: error }, 'Fatal startup error');
  }
  process.exit(1);
}
