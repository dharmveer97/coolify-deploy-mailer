import { pixelBasedPreset } from 'react-email';
import type { EmailTailwindConfig } from '@/types/email.types';

/**
 * Tailwind theme for all emails. `pixelBasedPreset` converts rem units to px, because many email
 * clients don't support rem (https://react.email/docs/components/tailwind).
 */
export const emailTailwindConfig: EmailTailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        success: '#16a34a',
        failure: '#dc2626',
        ink: '#18181b',
        muted: '#71717a',
        line: '#e4e4e7',
        canvas: '#fafafa',
        code: '#f4f4f5',
        brand: '#2563eb',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
};
