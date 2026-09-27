import type { ValidationIssue } from '@/types/zod.types';

/** Format Zod issues as "path: message" strings. */
export function formatValidationIssues(issues: readonly ValidationIssue[]): string[] {
  return issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
}
