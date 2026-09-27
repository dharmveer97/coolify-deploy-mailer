import { fakeCoolify } from '@test/support/fakes';
import { deploymentPayload } from '@test/support/fixtures';
import { silentLogger } from '@test/support/logger';
import { describe, expect, it } from 'vitest';
import { CoolifyApiError } from '@/errors/coolify-api-error';
import { WebhookRejectedError } from '@/errors/webhook-rejected-error';
import { verifyDeployment } from '@/services/deployment-verifier';

const retry = { attempts: 2, baseDelayMs: 1 };

async function rejection(promise: Promise<unknown>): Promise<WebhookRejectedError> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(WebhookRejectedError);
  return error as WebhookRejectedError;
}

describe('verifyDeployment', () => {
  it('returns the deployment and application when everything matches', async () => {
    const result = await verifyDeployment(deploymentPayload(), fakeCoolify(), retry, silentLogger);
    expect(result.deployment.status).toBe('finished');
    expect(result.application.uuid).toBe('app-uuid-1');
  });

  it('rejects a deployment Coolify does not know (forged uuid)', async () => {
    const coolify = fakeCoolify();
    coolify.getDeployment.mockRejectedValue(new CoolifyApiError('404', 404, false));

    const error = await rejection(
      verifyDeployment(deploymentPayload(), coolify, retry, silentLogger),
    );
    expect(error.reason).toBe('deployment-not-found');
  });

  it('rejects when the deployment belongs to another application', async () => {
    const coolify = fakeCoolify({ application: { uuid: 'someone-elses-app' } });
    const error = await rejection(
      verifyDeployment(deploymentPayload(), coolify, retry, silentLogger),
    );
    expect(error.reason).toBe('application-mismatch');
    expect(coolify.getApplication).not.toHaveBeenCalled();
  });

  it('rejects when the deployment has no application', async () => {
    const coolify = fakeCoolify({ application: null });
    const error = await rejection(
      verifyDeployment(deploymentPayload(), coolify, retry, silentLogger),
    );
    expect(error.reason).toBe('application-mismatch');
  });

  it.each([
    ['deployment_success', 'failed'],
    ['deployment_success', 'in_progress'],
    ['deployment_failed', 'finished'],
    ['deployment_failed', 'cancelled-by-user'],
  ] as const)('rejects %s when Coolify says %s', async (event, status) => {
    const coolify = fakeCoolify({ status });
    const error = await rejection(
      verifyDeployment(
        deploymentPayload({ event, success: event === 'deployment_success' }),
        coolify,
        retry,
        silentLogger,
      ),
    );
    expect(error.reason).toBe('status-mismatch');
  });

  it('rejects an unknown application', async () => {
    const coolify = fakeCoolify();
    coolify.getApplication.mockRejectedValue(new CoolifyApiError('404', 404, false));
    const error = await rejection(
      verifyDeployment(deploymentPayload(), coolify, retry, silentLogger),
    );
    expect(error.reason).toBe('deployment-not-found');
  });

  it('fails closed when Coolify cannot be reached', async () => {
    const coolify = fakeCoolify();
    coolify.getDeployment.mockRejectedValue(new CoolifyApiError('down', 503, true));

    const error = await rejection(
      verifyDeployment(deploymentPayload(), coolify, retry, silentLogger),
    );
    expect(error.reason).toBe('coolify-unreachable');
    expect(coolify.getDeployment).toHaveBeenCalledTimes(2);
  });

  it('fails closed on unexpected errors', async () => {
    const coolify = fakeCoolify();
    coolify.getApplication.mockRejectedValue('boom');
    const error = await rejection(
      verifyDeployment(deploymentPayload(), coolify, retry, silentLogger),
    );
    expect(error.reason).toBe('coolify-unreachable');
  });

  it('does not retry a token that Coolify rejects', async () => {
    const coolify = fakeCoolify();
    coolify.getDeployment.mockRejectedValue(new CoolifyApiError('401', 401, false));
    const error = await rejection(
      verifyDeployment(deploymentPayload(), coolify, retry, silentLogger),
    );
    expect(error.reason).toBe('coolify-unreachable');
    expect(coolify.getDeployment).toHaveBeenCalledTimes(1);
  });
});
