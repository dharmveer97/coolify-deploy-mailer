import type { ReactElement } from 'react';
import { Body, Container, Head, Hr, Html, Preview, Tailwind, Text } from 'react-email';
import { emailTailwindConfig } from '@/emails/tailwind-config';
import type { EmailLayoutProps } from '@/types/email.types';

const ACCENT_CLASS = { success: 'border-t-success', failure: 'border-t-failure' } as const;

/**
 * Shell shared by every email. `lang`/`dir` are set on both Html and Body because some clients
 * strip one of them (https://react.email/docs/components/html).
 */
export function EmailLayout({ preview, tone, children }: EmailLayoutProps): ReactElement {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind config={emailTailwindConfig}>
        <Head />
        <Preview>{preview}</Preview>
        <Body lang="en" dir="ltr" className="m-0 bg-canvas py-6 font-sans text-ink">
          <Container
            className={`mx-auto max-w-[600px] rounded-[8px] border border-solid border-line border-t-4 bg-white p-6 ${ACCENT_CLASS[tone]}`}
          >
            {children}
            <Hr className="my-5 border-line" />
            <Text className="m-0 text-xs text-muted">
              Sent by coolify-deploy-mailer for your Coolify deployment notifications.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
