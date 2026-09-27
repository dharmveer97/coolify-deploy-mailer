import { COOLIFY_PUBLIC_URL, SHA } from '@test/support/fixtures';
import { silentLogger } from '@test/support/logger';
import { vi } from 'vitest';
import { DeploymentNotifier } from '@/services/deployment-notifier';
import type { CoolifyApi, CoolifyApplication, CoolifyDeployment } from '@/types/coolify.types';
import type { Mailer, RenderedEmail } from '@/types/email.types';
import type { NotifierOptions } from '@/types/notifier.types';

/** Records emails instead of sending them; can be told to fail the first N sends. */
export class FakeMailer implements Mailer {
  readonly sent: RenderedEmail[] = [];
  failuresBeforeSuccess = 0;

  async send(email: RenderedEmail): Promise<void> {
    if (this.failuresBeforeSuccess > 0) {
      this.failuresBeforeSuccess--;
      throw new Error('SMTP unavailable');
    }
    this.sent.push(email);
  }

  async verify(): Promise<void> {}

  close(): void {}
}

export type FakeCoolify = CoolifyApi & {
  getDeployment: ReturnType<typeof vi.fn<CoolifyApi['getDeployment']>>;
  getApplication: ReturnType<typeof vi.fn<CoolifyApi['getApplication']>>;
};

export function fakeCoolify(
  deployment: Partial<CoolifyDeployment> = {},
  application: Partial<CoolifyApplication> = {},
): FakeCoolify {
  return {
    getDeployment: vi.fn<CoolifyApi['getDeployment']>(async (uuid) => ({
      deployment_uuid: uuid,
      status: 'finished',
      application_name: 'shop-api',
      deployment_url: `/project/p/environment/e/application/app-uuid-1/deployment/${uuid}`,
      commit: SHA,
      commit_message: 'fix(api): handle empty carts\n\nCloses #42',
      pull_request_id: 0,
      application: { uuid: 'app-uuid-1' },
      ...deployment,
    })),
    getApplication: vi.fn<CoolifyApi['getApplication']>(async (uuid) => ({
      uuid,
      name: 'shop-api',
      fqdn: 'https://api.shop.example.com',
      git_repository: 'acme/shop-api',
      git_branch: 'main',
      ...application,
    })),
  };
}

/** A real DeploymentNotifier wired to fakes, with near-zero retry delays. */
export function createTestNotifier(
  overrides: Partial<NotifierOptions> & { mailer?: FakeMailer } = {},
): { notifier: DeploymentNotifier; mailer: FakeMailer } {
  const mailer = overrides.mailer ?? new FakeMailer();
  const notifier = new DeploymentNotifier({
    config: {
      gitBaseUrl: 'https://github.com',
      notify: { success: true, failure: true },
      coolifyPublicUrl: COOLIFY_PUBLIC_URL,
    },
    coolify: fakeCoolify(),
    logger: silentLogger,
    retry: { attempts: 3, baseDelayMs: 1 },
    ...overrides,
    mailer,
  });
  return { notifier, mailer };
}
