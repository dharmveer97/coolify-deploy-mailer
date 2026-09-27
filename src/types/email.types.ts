import type { ComponentProps, ReactNode } from 'react';
import type { Tailwind } from 'react-email';
import type { CommitDetails } from '@/types/commit.types';

/** Everything the deployment email templates need. */
export interface DeploymentEmailData {
  success: boolean;
  applicationName: string;
  project: string | undefined;
  environment: string | undefined;
  deploymentUrl: string | undefined;
  applicationUrl: string | undefined;
  pullRequestId: number | undefined;
  commit: CommitDetails;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(email: RenderedEmail): Promise<void>;
  verify(): Promise<void>;
  close(): void;
}

/** A label/value row in the email's details table. */
export interface DetailRow {
  label: string;
  value: string;
  href?: string | undefined;
  monospace?: boolean;
}

type EmailTone = 'success' | 'failure';

export interface EmailLayoutProps {
  preview: string;
  tone: EmailTone;
  children: ReactNode;
}

/** Config accepted by React Email's <Tailwind> component. */
export type EmailTailwindConfig = NonNullable<ComponentProps<typeof Tailwind>['config']>;

export interface DetailTableProps {
  rows: DetailRow[];
}

export interface CommitMessageProps {
  message: string;
}

export interface ActionLink {
  label: string;
  href: string | undefined;
}

export interface ActionLinksProps {
  links: ActionLink[];
}

export interface DeploymentEmailProps {
  data: DeploymentEmailData;
}
