import type { ReactElement, ReactNode } from 'react';
import { CodeInline, Column, Link, Row, Section } from 'react-email';
import type { DetailRow, DetailTableProps } from '@/types/email.types';

/** Label/value rows such as Project, Environment, Branch and Commit. */
export function DetailTable({ rows }: DetailTableProps): ReactElement {
  return (
    <Section>
      {rows.map((row) => (
        <Row key={row.label}>
          <Column className="w-[120px] py-1 pr-4 align-top text-sm text-muted">{row.label}</Column>
          <Column className="py-1 text-sm">
            <DetailValue row={row} />
          </Column>
        </Row>
      ))}
    </Section>
  );
}

function DetailValue({ row }: { row: DetailRow }): ReactNode {
  const value = row.monospace ? (
    <CodeInline className="rounded-[4px] bg-code px-1 font-mono">{row.value}</CodeInline>
  ) : (
    row.value
  );
  return row.href ? (
    <Link href={row.href} className="text-brand underline">
      {value}
    </Link>
  ) : (
    value
  );
}
