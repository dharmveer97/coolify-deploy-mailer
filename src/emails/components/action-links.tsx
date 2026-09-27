import type { ReactElement } from 'react';
import { Button, Link, Section } from 'react-email';
import type { ActionLinksProps } from '@/types/email.types';

/**
 * The first safe link becomes a button, the rest are text links. Links without a safe URL are
 * skipped entirely.
 */
export function ActionLinks({ links }: ActionLinksProps): ReactElement | null {
  const [primary, ...secondary] = links.filter((link) => link.href !== undefined);
  if (!primary) {
    return null;
  }

  return (
    <Section className="mt-5">
      <Button
        href={primary.href}
        className="rounded-[6px] bg-ink px-4 py-2.5 text-sm font-medium text-white no-underline"
      >
        {primary.label}
      </Button>
      {secondary.map((link) => (
        <Link key={link.label} href={link.href} className="ml-4 text-sm text-brand underline">
          {link.label}
        </Link>
      ))}
    </Section>
  );
}
