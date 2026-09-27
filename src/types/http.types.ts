import type { WebhookConfig } from '@/types/config.types';
import type { AppLogger } from '@/types/logger.types';
import type { DeploymentNotifierPort } from '@/types/notifier.types';

export interface AppOptions {
  logger: AppLogger;
  notifier: DeploymentNotifierPort;
  webhook: WebhookConfig;
  trustProxy: boolean;
}

export interface WebhookRouterOptions extends WebhookConfig {
  notifier: DeploymentNotifierPort;
}
