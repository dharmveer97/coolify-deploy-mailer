import { MAX_COMMIT_MESSAGE_LENGTH } from '@/constants/limits';
import type { CommitDetails, CommitDetailsInput } from '@/types/commit.types';
import { commitWebUrl } from '@/utils/git';
import { toTrimmedText } from '@/utils/text';

const COMMIT_SHA = /^[0-9a-f]{7,64}$/i;

/** Turn raw Coolify deployment/application fields into what the email shows. */
export function buildCommitDetails(input: CommitDetailsInput): CommitDetails {
  const rawSha = input.commit?.trim() ?? '';
  const sha = COMMIT_SHA.test(rawSha) ? rawSha : undefined;
  const branch = input.isPreview ? undefined : toTrimmedText(input.gitBranch, 255);

  return {
    sha,
    shortSha: sha?.slice(0, 7),
    url: sha ? commitWebUrl(input.gitRepository, sha, input.gitBaseUrl) : undefined,
    branch,
    message: toTrimmedText(input.commitMessage, MAX_COMMIT_MESSAGE_LENGTH),
  };
}
