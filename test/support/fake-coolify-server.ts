import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { SHA } from '@test/support/fixtures';

const RESPONSES: Record<string, unknown> = {
  '/api/v1/deployments/dep-uuid-1': {
    deployment_uuid: 'dep-uuid-1',
    status: 'finished',
    application: { uuid: 'app-uuid-1' },
    deployment_url: '/project/p/environment/e/application/app-uuid-1/deployment/dep-uuid-1',
    commit: SHA,
    commit_message: 'feat: ship it',
  },
  '/api/v1/applications/app-uuid-1': {
    uuid: 'app-uuid-1',
    name: 'shop-api',
    git_repository: 'acme/shop',
    git_branch: 'main',
  },
};

/** A real HTTP server that answers the two Coolify API endpoints the service calls. */
export async function startFakeCoolifyServer(): Promise<{
  url: string;
  authHeaders: string[];
  close: () => Promise<void>;
}> {
  const authHeaders: string[] = [];
  const server: Server = createServer((req, res) => {
    authHeaders.push(req.headers.authorization ?? '');
    res.setHeader('content-type', 'application/json');
    const body = RESPONSES[req.url ?? ''];
    if (body === undefined) {
      res.statusCode = 404;
      res.end('{"message":"Not found"}');
      return;
    }
    res.end(JSON.stringify(body));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    authHeaders,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  };
}
