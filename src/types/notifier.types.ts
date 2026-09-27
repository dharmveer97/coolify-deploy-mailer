import type { Config } from '@/types/config.types';
import type { CoolifyApi, CoolifyApplication, CoolifyDeployment } from '@/types/coolify.types';
import type { Mailer } from '@/types/email.types';
import type { AppLogger } from '@/types/logger.types';
import type { RetryPolicy } from '@/types/retry.types';
import type { DeploymentEvent } from '@/types/webhook.types';

export interface NotifierOptions {
  config: Pick<Config, 'gitBaseUrl' | 'notify'> & { coolifyPublicUrl: string };
  coolify: CoolifyApi;
  mailer: Mailer;
  logger: AppLogger;
  retry?: RetryPolicy;
  dedupeTtlMs?: number;
}

/** What happened to an accepted deployment webhook. */
export type AcceptResult = 'queued' | 'duplicate' | 'disabled';

/** The part of the notifier the HTTP layer depends on. */
export interface DeploymentNotifierPort {
  accept(event: DeploymentEvent): AcceptResult;
  drain(): Promise<void>;
}

/** Why a deployment webhook was not turned into an email. */
export type RejectionReason =
  | 'deployment-not-found'
  | 'application-mismatch'
  | 'status-mismatch'
  | 'coolify-unreachable';

/** A deployment that the Coolify API confirmed matches the webhook. */
export interface VerifiedDeployment {
  deployment: CoolifyDeployment;
  application: CoolifyApplication;
}

/** Settings needed to turn a verified deployment into email data. */
export interface EmailDataContext {
  gitBaseUrl: string;
  coolifyPublicUrl: string;
}
