import { deploymentPayload } from '@test/support/fixtures';
import { describe, expect, it } from 'vitest';
import { parseWebhookPayload } from '@/validators/parse-webhook-payload';

describe('parseWebhookPayload', () => {
  it('parses a deployment success payload exactly as Coolify sends it', () => {
    expect(parseWebhookPayload(deploymentPayload())).toEqual({
      ok: true,
      value: { kind: 'deployment', payload: deploymentPayload() },
    });
  });

  it('parses a failure payload with preview fields', () => {
    const result = parseWebhookPayload({
      ...deploymentPayload({ event: 'deployment_failed', success: false }),
      pull_request_id: 7,
      preview_fqdn: 'https://pr-7.shop.example.com',
    });

    expect(result).toMatchObject({
      ok: true,
      value: { kind: 'deployment', payload: { event: 'deployment_failed', pull_request_id: 7 } },
    });
  });

  it('recognizes the Coolify test notification', () => {
    expect(
      parseWebhookPayload({ success: true, event: 'test', message: 'hi', url: 'https://x' }),
    ).toEqual({
      ok: true,
      value: { kind: 'test' },
    });
  });

  it('ignores other Coolify events', () => {
    expect(parseWebhookPayload({ event: 'backup_failed' })).toEqual({
      ok: true,
      value: { kind: 'ignored', event: 'backup_failed' },
    });
  });

  it.each([
    ['not an object', 'hello'],
    ['missing event', {}],
    ['event is not a string', { event: 42 }],
    ['missing deployment uuid', { ...deploymentPayload(), deployment_uuid: undefined }],
    ['path traversal in uuid', deploymentPayload({ deployment_uuid: '../../api/v1/servers' })],
    ['javascript: deployment url', deploymentPayload({ deployment_url: 'javascript:alert(1)' })],
    ['huge application name', deploymentPayload({ application_name: 'x'.repeat(10_000) })],
    ['negative pull request id', deploymentPayload({ pull_request_id: -1 })],
  ])('rejects %s and explains why', (_label, body) => {
    const result = parseWebhookPayload(body);
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues).not.toHaveLength(0);
  });
});
