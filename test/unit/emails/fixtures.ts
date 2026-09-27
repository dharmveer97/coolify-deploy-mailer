import { SHA, SHORT_SHA } from '@test/support/fixtures';
import type { DeploymentEmailData } from '@/types/email.types';

export const emailData: DeploymentEmailData = {
  success: true,
  applicationName: 'shop-api',
  project: 'Shop',
  environment: 'production',
  deploymentUrl: 'https://coolify.example.com/deployment/1',
  applicationUrl: 'https://api.shop.example.com',
  pullRequestId: undefined,
  commit: {
    sha: SHA,
    shortSha: SHORT_SHA,
    url: `https://github.com/acme/shop/commit/${SHA}`,
    branch: 'main',
    message: 'fix: handle empty carts\n\nCloses #42',
  },
};

export const noCommit: DeploymentEmailData['commit'] = {
  sha: undefined,
  shortSha: undefined,
  url: undefined,
  branch: undefined,
  message: undefined,
};
