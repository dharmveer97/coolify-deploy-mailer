import type { RejectionReason } from '@/types/notifier.types';

/** A deployment webhook that could not be verified against the Coolify API. No email is sent. */
export class WebhookRejectedError extends Error {
  override readonly name = 'WebhookRejectedError';

  constructor(
    readonly reason: RejectionReason,
    message: string,
  ) {
    super(message);
  }
}
