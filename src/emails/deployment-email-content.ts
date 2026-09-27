import type { ActionLink, DeploymentEmailData, DetailRow } from '@/types/email.types';
import { toSingleLine } from '@/utils/text';
import { toSafeHref } from '@/utils/url';

/**
 * Presentation logic shared by the HTML and plain-text templates, so both always show the
 * same information.
 */
function statusWord(data: DeploymentEmailData): 'succeeded' | 'failed' {
  return data.success ? 'succeeded' : 'failed';
}

/** "shop-api (PR #12)" — always a single line. */
function displayTitle(data: DeploymentEmailData): string {
  const name = toSingleLine(data.applicationName);
  return data.pullRequestId === undefined ? name : `${name} (PR #${data.pullRequestId})`;
}

export function buildSubject(data: DeploymentEmailData): string {
  const icon = data.success ? '✅' : '❌';
  const commit = data.commit.shortSha ? ` @ ${data.commit.shortSha}` : '';
  return `${icon} Deployment ${statusWord(data)}: ${displayTitle(data)}${commit}`;
}

/** Inbox preview text; keep it short (the docs recommend under 90 characters). */
export function buildPreviewText(data: DeploymentEmailData): string {
  const commit = data.commit.shortSha ? ` · ${data.commit.shortSha}` : '';
  const message = data.commit.message?.split('\n')[0] ?? '';
  return `${buildHeading(data)}${commit}${message ? ` · ${message}` : ''}`.slice(0, 90);
}

export function buildHeading(data: DeploymentEmailData): string {
  return `Deployment ${statusWord(data)}: ${displayTitle(data)}`;
}

export function buildDetailRows(data: DeploymentEmailData): DetailRow[] {
  const rows: DetailRow[] = [];
  if (data.project) {
    rows.push({ label: 'Project', value: toSingleLine(data.project) });
  }
  if (data.environment) {
    rows.push({ label: 'Environment', value: toSingleLine(data.environment) });
  }
  if (data.commit.branch) {
    rows.push({ label: 'Branch', value: toSingleLine(data.commit.branch) });
  }
  if (data.pullRequestId !== undefined) {
    rows.push({ label: 'Pull request', value: `#${data.pullRequestId}` });
  }
  if (data.commit.shortSha) {
    rows.push({
      label: 'Commit',
      value: data.commit.shortSha,
      href: toSafeHref(data.commit.url),
      monospace: true,
    });
  }
  return rows;
}

export function buildActionLinks(data: DeploymentEmailData): ActionLink[] {
  return [
    { label: 'View deployment logs', href: toSafeHref(data.deploymentUrl) },
    { label: 'Open application', href: toSafeHref(data.applicationUrl) },
  ];
}
