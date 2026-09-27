import type { ReactElement } from 'react';
import { Heading } from 'react-email';
import { ActionLinks } from '@/emails/components/action-links';
import { CommitMessage } from '@/emails/components/commit-message';
import { DetailTable } from '@/emails/components/detail-table';
import { EmailLayout } from '@/emails/components/email-layout';
import {
  buildActionLinks,
  buildDetailRows,
  buildHeading,
  buildPreviewText,
} from '@/emails/deployment-email-content';
import type { DeploymentEmailProps } from '@/types/email.types';

/** Sent when a Coolify deployment succeeds or fails. */
export function DeploymentEmail({ data }: DeploymentEmailProps): ReactElement {
  return (
    <EmailLayout preview={buildPreviewText(data)} tone={data.success ? 'success' : 'failure'}>
      <Heading as="h1" className="mt-0 mb-4 text-lg font-semibold leading-[26px]">
        {buildHeading(data)}
      </Heading>
      <DetailTable rows={buildDetailRows(data)} />
      {data.commit.message && <CommitMessage message={data.commit.message} />}
      <ActionLinks links={buildActionLinks(data)} />
    </EmailLayout>
  );
}
