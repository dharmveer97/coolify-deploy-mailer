import { buildActionLinks, buildDetailRows, buildHeading } from '@/emails/deployment-email-content';
import type { DeploymentEmailData } from '@/types/email.types';

/**
 * Plain-text version of the deployment email. Written by hand because React Email's automatic
 * plain-text conversion merges table cells ("ProjectShop") and drops line breaks.
 */
export function renderDeploymentEmailText(data: DeploymentEmailData): string {
  const details = buildDetailRows(data).map((row) =>
    row.label === 'Commit' && data.commit.sha
      ? `Commit: ${data.commit.sha}${data.commit.url ? ` (${data.commit.url})` : ''}`
      : `${row.label}: ${row.value}`,
  );

  const message = data.commit.message ? ['', 'Commit message:', data.commit.message] : [];

  const links = buildActionLinks(data)
    .filter((link) => link.href !== undefined)
    .map((link) => `${link.label}: ${link.href ?? ''}`);

  return [buildHeading(data), '', ...details, ...message, '', ...links, ''].join('\n');
}
