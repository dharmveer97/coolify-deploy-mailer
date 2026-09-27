import { COOLIFY_PUBLIC_URL, deploymentPayload, SHA } from '@test/support/fixtures';
import { describe, expect, it } from 'vitest';
import { toDeploymentEmailData } from '@/services/deployment-email-data';
import type { VerifiedDeployment } from '@/types/notifier.types';

const context = { gitBaseUrl: 'https://github.com', coolifyPublicUrl: COOLIFY_PUBLIC_URL };

function verified(
  overrides: {
    deployment?: Partial<VerifiedDeployment['deployment']>;
    application?: Partial<VerifiedDeployment['application']>;
  } = {},
): VerifiedDeployment {
  return {
    deployment: {
      deployment_uuid: 'dep-uuid-1',
      status: 'finished',
      application_name: 'api-name-from-deployment',
      deployment_url: '/project/p/environment/e/application/a/deployment/dep-uuid-1',
      commit: SHA,
      commit_message: 'feat: x',
      pull_request_id: 0,
      application: { uuid: 'app-uuid-1' },
      ...overrides.deployment,
    },
    application: {
      uuid: 'app-uuid-1',
      name: 'shop-api',
      fqdn: 'https://api.shop.example.com',
      git_repository: 'acme/shop',
      git_branch: 'main',
      ...overrides.application,
    },
  };
}

describe('toDeploymentEmailData', () => {
  it('uses Coolify data for the name and every link, not the webhook body', () => {
    const forgedLinks = deploymentPayload({
      application_name: 'Forged name',
      deployment_url: 'https://evil.example.com/login',
      fqdn: 'https://evil.example.com',
    });

    const data = toDeploymentEmailData(forgedLinks, verified(), context);

    expect(data.applicationName).toBe('shop-api');
    expect(data.deploymentUrl).toBe(
      `${COOLIFY_PUBLIC_URL}/project/p/environment/e/application/a/deployment/dep-uuid-1`,
    );
    expect(data.applicationUrl).toBe('https://api.shop.example.com');
    expect(JSON.stringify(data)).not.toContain('evil.example.com');
  });

  it('takes project and environment names from the webhook as plain text', () => {
    const data = toDeploymentEmailData(deploymentPayload(), verified(), context);
    expect(data).toMatchObject({ project: 'Shop', environment: 'production' });
  });

  it('marks failure events as failed', () => {
    const data = toDeploymentEmailData(
      deploymentPayload({ event: 'deployment_failed', success: false }),
      verified({ deployment: { status: 'failed' } }),
      context,
    );
    expect(data.success).toBe(false);
  });

  it('uses the pull request from Coolify and does not link previews', () => {
    const data = toDeploymentEmailData(
      deploymentPayload({ preview_fqdn: 'https://evil.example.com' }),
      verified({ deployment: { pull_request_id: 9 } }),
      context,
    );
    expect(data.pullRequestId).toBe(9);
    expect(data.applicationUrl).toBeUndefined();
    expect(data.commit.branch).toBeUndefined();
  });

  it('falls back through the available names', () => {
    expect(
      toDeploymentEmailData(deploymentPayload(), verified({ application: { name: null } }), context)
        .applicationName,
    ).toBe('api-name-from-deployment');
    expect(
      toDeploymentEmailData(
        deploymentPayload({ application_name: 'webhook-name' }),
        verified({ application: { name: null }, deployment: { application_name: null } }),
        context,
      ).applicationName,
    ).toBe('webhook-name');
  });

  it('leaves out missing project, environment and deployment link', () => {
    const data = toDeploymentEmailData(
      deploymentPayload({ project: null, environment: null }),
      verified({ deployment: { deployment_url: null, pull_request_id: null } }),
      context,
    );
    expect(data).toMatchObject({
      project: undefined,
      environment: undefined,
      deploymentUrl: undefined,
    });
  });
});
