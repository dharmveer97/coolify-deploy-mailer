/** Collapse control characters (including CR/LF) so a value is safe in one-line contexts like subjects. */
export function toSingleLine(value: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
}

/** Normalize line endings, trim, and cut to `maxLength` characters (adding "…"). Empty → undefined. */
export function toTrimmedText(
  value: string | null | undefined,
  maxLength: number,
): string | undefined {
  const text = value?.replace(/\r\n?/g, '\n').trim();
  if (!text) {
    return undefined;
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}
