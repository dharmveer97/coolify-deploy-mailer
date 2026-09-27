import type { z } from 'zod';
import type {
  coolifyApplicationSchema,
  coolifyDeploymentSchema,
} from '@/schemas/coolify-api.schema';

export type CoolifyDeployment = z.output<typeof coolifyDeploymentSchema>;
export type CoolifyApplication = z.output<typeof coolifyApplicationSchema>;

/** The Coolify API calls this service needs. Implemented by `CoolifyClient`, faked in tests. */
export interface CoolifyApi {
  getDeployment(deploymentUuid: string): Promise<CoolifyDeployment>;
  getApplication(applicationUuid: string): Promise<CoolifyApplication>;
}

export interface CoolifyClientOptions {
  baseUrl: string;
  apiToken: string;
  timeoutMs: number;
  fetch?: typeof fetch;
}
