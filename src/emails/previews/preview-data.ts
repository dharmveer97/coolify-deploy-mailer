import type { DeploymentEmailData } from '@/types/email.types';

const SHA = '6b7fb7a48bce74c41c360ec3969ed827ae56cc44';

/** Realistic sample data for the email preview server. */
export function previewDeploymentData({ success }: { success: boolean }): DeploymentEmailData {
  return {
    success,
    applicationName: 'shop-api',
    project: 'Shop',
    environment: 'production',
    deploymentUrl: 'https://coolify.example.com/project/p/environment/e/application/a/deployment/d',
    applicationUrl: success ? 'https://api.shop.example.com' : undefined,
    pullRequestId: undefined,
    commit: {
      sha: SHA,
      shortSha: SHA.slice(0, 7),
      url: `https://github.com/acme/shop-api/commit/${SHA}`,
      branch: 'main',
      message: success
        ? 'feat(cart): support discount codes\n\nAdds validation and applies codes at checkout.'
        : 'feat(ui): add product page build step\n\nRuns the new frontend build during the image build.',
    },
  };
}
