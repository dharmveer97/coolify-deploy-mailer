import type { DeploymentEvent } from '@/types/webhook.types';

export const SECRET = 'test-secret-0123456789abcdefghijklmnopqrstuvwxyz';
export const SHA = '6b7fb7a48bce74c41c360ec3969ed827ae56cc44';
export const SHORT_SHA = SHA.slice(0, 7);
export const WEBHOOK_PATH = `/webhooks/coolify/${SECRET}`;
export const COOLIFY_PUBLIC_URL = 'https://coolify.example.com';

/** A deployment webhook body exactly as Coolify sends it. */
export function deploymentPayload(overrides: Partial<DeploymentEvent> = {}): DeploymentEvent {
  return {
    success: true,
    message: 'New version successfully deployed',
    event: 'deployment_success',
    application_name: 'shop-api',
    application_uuid: 'app-uuid-1',
    deployment_uuid: 'dep-uuid-1',
    deployment_url:
      'https://coolify.example.com/project/p/environment/e/application/a/deployment/d',
    project: 'Shop',
    environment: 'production',
    fqdn: 'https://api.shop.example.com',
    ...overrides,
  };
}

export const validEnv = {
  WEBHOOK_SECRET: SECRET,
  COOLIFY_URL: 'https://coolify.example.com/',
  COOLIFY_API_TOKEN: 'token',
  SMTP_HOST: 'smtp.example.com',
  MAIL_FROM: 'Coolify <deploy@example.com>',
  MAIL_TO: 'dev@example.com, ops@example.com',
};
