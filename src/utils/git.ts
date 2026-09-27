const SCP_STYLE_URL = /^[\w.-]+@([\w.-]+):(.+)$/;
const OWNER_REPO = /^[\w.-]+\/[\w./-]+$/;
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'ssh:']);

/**
 * Web link to a commit. Mirrors Coolify's `Application::gitCommitLink()`:
 * - `owner/repo` (GitHub App / deploy key sources) → `${gitBaseUrl}/owner/repo/commit/<sha>`
 * - https://, ssh:// and git@host:owner/repo URLs → `https://host/owner/repo/commit/<sha>`
 * - Bitbucket uses `/commits/`. Credentials are dropped. Returns undefined when unsure.
 */
export function commitWebUrl(
  gitRepository: string | null | undefined,
  sha: string,
  gitBaseUrl: string,
): string | undefined {
  const repository = gitRepository?.trim();
  if (!repository) {
    return undefined;
  }

  const url = parseRepositoryUrl(repository, gitBaseUrl);
  if (!url) {
    return undefined;
  }

  const path = url.pathname.replace(/\.git$/, '').replace(/\/+$/, '');
  if (path === '') {
    return undefined;
  }

  const segment = url.hostname.includes('bitbucket') ? 'commits' : 'commit';
  // An ssh:// port is the SSH port, not the web port.
  const host = url.protocol === 'ssh:' ? url.hostname : url.host;
  const scheme = url.protocol === 'http:' ? 'http' : 'https';
  return `${scheme}://${host}${path}/${segment}/${sha}`;
}

function parseRepositoryUrl(repository: string, gitBaseUrl: string): URL | undefined {
  try {
    const url = new URL(toUrlString(repository, gitBaseUrl));
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

function toUrlString(repository: string, gitBaseUrl: string): string {
  if (SCP_STYLE_URL.test(repository)) {
    return repository.replace(SCP_STYLE_URL, 'https://$1/$2');
  }
  if (OWNER_REPO.test(repository)) {
    return `${gitBaseUrl}/${repository}`;
  }
  return repository;
}
