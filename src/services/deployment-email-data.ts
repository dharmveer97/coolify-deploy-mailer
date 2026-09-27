import type { DeploymentEmailData } from '@/types/email.types';
import type { EmailDataContext, VerifiedDeployment } from '@/types/notifier.types';
import type { DeploymentEvent } from '@/types/webhook.types';
import { buildCommitDetails } from '@/utils/commit-details';
import { coolifyLink, firstDomain } from '@/utils/url';

/**
 * Build the email from Coolify's own data. The webhook only contributes the project and
 * environment names (plain text); every link and the commit come from the verified API response.
 */
export function toDeploymentEmailData(
  event: DeploymentEvent,
  { deployment, application }: VerifiedDeployment,
  context: EmailDataContext,
): DeploymentEmailData {
  const pullRequestId = (deployment.pull_request_id ?? 0) > 0 ? deployment.pull_request_id : null;
  const isPreview = pullRequestId !== null;

  return {
    success: event.event === 'deployment_success',
    applicationName: application.name ?? deployment.application_name ?? event.application_name,
    project: event.project ?? undefined,
    environment: event.environment ?? undefined,
    deploymentUrl: coolifyLink(deployment.deployment_url, context.coolifyPublicUrl),
    // Preview URLs are not in the API response, so they are not linked.
    applicationUrl: isPreview ? undefined : firstDomain(application.fqdn),
    pullRequestId: pullRequestId ?? undefined,
    commit: buildCommitDetails({
      commit: deployment.commit,
      commitMessage: deployment.commit_message,
      gitRepository: application.git_repository,
      gitBranch: application.git_branch,
      isPreview,
      gitBaseUrl: context.gitBaseUrl,
    }),
  };
}
