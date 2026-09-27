import { describe, expect, it } from 'vitest';
import { toSingleLine, toTrimmedText } from '@/utils/text';
import { coolifyLink, firstDomain, toSafeHref } from '@/utils/url';

describe('toSingleLine', () => {
  it('removes line breaks and control characters', () => {
    expect(toSingleLine('a\r\nBcc: x@y.z\u0000b')).toBe('a Bcc: x@y.z b');
  });
});

describe('toTrimmedText', () => {
  it('normalizes line endings and trims', () => {
    expect(toTrimmedText('  a\r\nb\r  ', 10)).toBe('a\nb');
  });
  it('returns undefined for empty values', () => {
    expect(toTrimmedText('   ', 10)).toBeUndefined();
    expect(toTrimmedText(null, 10)).toBeUndefined();
  });
  it('truncates with an ellipsis', () => {
    expect(toTrimmedText('abcdef', 3)).toBe('abc…');
  });
});

describe('toSafeHref', () => {
  it.each([
    ['https://example.com/a?b=1', 'https://example.com/a?b=1'],
    ['http://example.com', 'http://example.com/'],
    ['javascript:alert(1)', undefined],
    ['data:text/html,hi', undefined],
    ['nope', undefined],
    [undefined, undefined],
  ])('%s → %s', (value, expected) => {
    expect(toSafeHref(value)).toBe(expected);
  });
});

describe('firstDomain', () => {
  it.each([
    ['https://a.example.com,https://b.example.com', 'https://a.example.com'],
    [' , https://b.example.com', 'https://b.example.com'],
    ['', undefined],
    [null, undefined],
  ])('%s → %s', (value, expected) => {
    expect(firstDomain(value)).toBe(expected);
  });
});

describe('coolifyLink', () => {
  const base = 'https://coolify.example.com';
  it.each([
    ['/project/p/deployment/d', 'https://coolify.example.com/project/p/deployment/d'],
    ['https://evil.example.com/x', undefined],
    ['//evil.example.com/x', undefined],
    ['javascript:alert(1)', undefined],
    [null, undefined],
  ])('%s → %s', (path, expected) => {
    expect(coolifyLink(path, base)).toBe(expected);
  });
});
