/** Only http(s) URLs may be linked from an email; anything else (javascript:, data:, …) is dropped. */
export function toSafeHref(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Coolify stores several domains comma-separated; return the first non-empty one. */
export function firstDomain(value: string | null | undefined): string | undefined {
  return value
    ?.split(',')
    .map((domain) => domain.trim())
    .find((domain) => domain !== '');
}

/**
 * Coolify returns deployment links as paths ("/project/…/deployment/…"). Join them to the
 * public Coolify URL; anything that is not a plain path is ignored.
 */
export function coolifyLink(
  path: string | null | undefined,
  publicUrl: string,
): string | undefined {
  if (!path?.startsWith('/') || path.startsWith('//')) {
    return undefined;
  }
  return `${publicUrl}${path}`;
}
