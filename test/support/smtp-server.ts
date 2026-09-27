import type { AddressInfo } from 'node:net';
import { SMTPServer, type SMTPServerOptions } from 'smtp-server';

interface ReceivedMail {
  from: string | undefined;
  to: string[];
  raw: string;
}

export interface TestSmtpServer {
  port: number;
  received: ReceivedMail[];
  /** How many times a client tried to log in. */
  readonly authAttempts: number;
  close(): Promise<void>;
}

/** An in-process SMTP server that records every message it receives. */
export async function startSmtpServer(
  options: Partial<SMTPServerOptions> = {},
): Promise<TestSmtpServer> {
  const received: ReceivedMail[] = [];
  let authAttempts = 0;

  const server = new SMTPServer({
    secure: false,
    disabledCommands: ['STARTTLS'],
    authOptional: true,
    logger: false,
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        const mailFrom = session.envelope.mailFrom;
        received.push({
          from: mailFrom ? mailFrom.address : undefined,
          to: session.envelope.rcptTo.map((recipient) => recipient.address),
          raw: Buffer.concat(chunks).toString('utf8'),
        });
        callback();
      });
    },
    ...options,
    onAuth(auth, session, callback) {
      authAttempts++;
      if (options.onAuth) {
        options.onAuth(auth, session, callback);
        return;
      }
      callback(null, { user: auth.username });
    },
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.server.address() as AddressInfo;

  return {
    port,
    received,
    get authAttempts(): number {
      return authAttempts;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  };
}
