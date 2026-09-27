import nodemailer from 'nodemailer';
import { SMTP_CONNECTION_TIMEOUT_MS, SMTP_SOCKET_TIMEOUT_MS } from '@/constants/timing';
import type { Config } from '@/types/config.types';
import type { Mailer, RenderedEmail } from '@/types/email.types';

/** Sends emails through SMTP (Mailpit locally, your provider in production). */
export function createSmtpMailer(config: Pick<Config, 'smtp' | 'mail'>): Mailer {
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: config.smtp.requireTls,
    // Never downgrade: modern TLS only, and the server certificate must be valid.
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    ...(config.smtp.auth ? { auth: config.smtp.auth } : {}),
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });

  return {
    async send(email: RenderedEmail): Promise<void> {
      await transporter.sendMail({
        from: config.mail.from,
        to: config.mail.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    },
    async verify(): Promise<void> {
      await transporter.verify();
    },
    close(): void {
      transporter.close();
    },
  };
}
