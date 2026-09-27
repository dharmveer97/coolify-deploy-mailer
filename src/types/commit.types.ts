/** Commit information shown in the email. Every field is optional because Coolify may not know it. */
export interface CommitDetails {
  sha: string | undefined;
  shortSha: string | undefined;
  url: string | undefined;
  branch: string | undefined;
  message: string | undefined;
}

export interface CommitDetailsInput {
  commit: string | null | undefined;
  commitMessage: string | null | undefined;
  gitRepository: string | null | undefined;
  gitBranch: string | null | undefined;
  isPreview: boolean;
  gitBaseUrl: string;
}
