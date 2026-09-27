import type { ReactElement } from 'react';
import { Section, Text } from 'react-email';
import type { CommitMessageProps } from '@/types/email.types';

/** The commit message as pre-formatted plain text. React escapes any HTML inside it. */
export function CommitMessage({ message }: CommitMessageProps): ReactElement {
  return (
    <Section>
      <Text className="mt-5 mb-1 text-sm font-semibold">Commit message</Text>
      <Text className="m-0 whitespace-pre-wrap break-words rounded-[6px] bg-code p-3 font-mono text-[13px] leading-5">
        {message}
      </Text>
    </Section>
  );
}
