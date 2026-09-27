import { SHA } from '@test/support/fixtures';
import { describe, expect, it, vi } from 'vitest';
import { CoolifyApiError } from '@/errors/coolify-api-error';
import { CoolifyClient } from '@/services/coolify-client';

function clientWith(fetchImpl: typeof fetch): CoolifyClient {
  return new CoolifyClient({
    baseUrl: 'https://coolify.example.com',
    apiToken: 'secret-token',
    timeoutMs: 1_000,
    fetch: fetchImpl,
  });
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function errorFrom(promise: Promise<unknown>): Promise<CoolifyApiError> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(CoolifyApiError);
  return error as CoolifyApiError;
}

describe('CoolifyClient', () => {
  it('fetches a deployment with the bearer token and drops unknown fields', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json({
        deployment_uuid: 'dep-1',
        status: 'finished',
        commit: SHA,
        commit_message: 'msg',
        logs: 'secret',
      }),
    );

    await expect(clientWith(fetchMock).getDeployment('dep-1')).resolves.toEqual({
      deployment_uuid: 'dep-1',
      status: 'finished',
      commit: SHA,
      commit_message: 'msg',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://coolify.example.com/api/v1/deployments/dep-1',
      expect.objectContaining({
        method: 'GET',
        redirect: 'error',
        headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }),
      }),
    );
  });

  it('fetches an application', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json({ uuid: 'app-1', git_repository: 'acme/shop', git_branch: 'main' }),
    );
    await expect(clientWith(fetchMock).getApplication('app-1')).resolves.toEqual({
      uuid: 'app-1',
      git_repository: 'acme/shop',
      git_branch: 'main',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://coolify.example.com/api/v1/applications/app-1',
    );
  });

  it('encodes identifiers in the path', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      json({ deployment_uuid: 'a/b', status: 'finished' }),
    );
    await clientWith(fetchMock).getDeployment('a/b');
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://coolify.example.com/api/v1/deployments/a%2Fb',
    );
  });

  it.each([
    [401, false],
    [404, false],
    [429, true],
    [500, true],
    [503, true],
  ])('marks HTTP %i as retryable=%s', async (status, retryable) => {
    const error = await errorFrom(clientWith(async () => json({}, status)).getDeployment('dep-1'));
    expect(error).toMatchObject({ status, retryable });
  });

  it('treats network errors as retryable', async () => {
    const error = await errorFrom(
      clientWith(async () => {
        throw new TypeError('fetch failed');
      }).getDeployment('dep-1'),
    );
    expect(error).toMatchObject({ retryable: true, status: undefined });
    expect(error.message).toContain('fetch failed');
  });

  it('handles non-Error rejections', async () => {
    const error = await errorFrom(
      clientWith(() => Promise.reject(new Error('boom'))).getDeployment('dep-1'),
    );
    expect(error.retryable).toBe(true);
  });

  it('rejects unexpected or non-JSON bodies without retrying', async () => {
    const wrongShape = await errorFrom(
      clientWith(async () => json({ nope: true })).getDeployment('dep-1'),
    );
    expect(wrongShape.retryable).toBe(false);

    const notJson = await errorFrom(
      clientWith(async () => new Response('<html>', { status: 200 })).getDeployment('dep-1'),
    );
    expect(notJson.retryable).toBe(false);
  });

  it('never includes the token in error messages', async () => {
    const error = await errorFrom(clientWith(async () => json({}, 401)).getDeployment('dep-1'));
    expect(error.message).not.toContain('secret-token');
  });
});
