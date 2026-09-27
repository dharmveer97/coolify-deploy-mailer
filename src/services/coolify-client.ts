import { CoolifyApiError } from '@/errors/coolify-api-error';
import { coolifyApplicationSchema, coolifyDeploymentSchema } from '@/schemas/coolify-api.schema';
import type {
  CoolifyApi,
  CoolifyApplication,
  CoolifyClientOptions,
  CoolifyDeployment,
} from '@/types/coolify.types';
import type { Schema } from '@/types/zod.types';

/** Typed, read-only client for the two Coolify API endpoints this service needs. */
export class CoolifyClient implements CoolifyApi {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: CoolifyClientOptions) {
    this.fetchImpl = options.fetch ?? fetch;
  }

  getDeployment(deploymentUuid: string): Promise<CoolifyDeployment> {
    return this.get(
      `/api/v1/deployments/${encodeURIComponent(deploymentUuid)}`,
      coolifyDeploymentSchema,
    );
  }

  getApplication(applicationUuid: string): Promise<CoolifyApplication> {
    return this.get(
      `/api/v1/applications/${encodeURIComponent(applicationUuid)}`,
      coolifyApplicationSchema,
    );
  }

  private async get<T>(path: string, schema: Schema<T>): Promise<T> {
    const response = await this.request(path);

    if (!response.ok) {
      throw new CoolifyApiError(
        `Coolify API responded with HTTP ${response.status} for ${path}`,
        response.status,
        response.status === 429 || response.status >= 500,
      );
    }

    const body: unknown = await response.json().catch(() => undefined);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new CoolifyApiError(
        `Unexpected Coolify API response for ${path}`,
        response.status,
        false,
      );
    }
    return parsed.data;
  }

  private async request(path: string): Promise<Response> {
    try {
      return await this.fetchImpl(`${this.options.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.options.apiToken}`,
          Accept: 'application/json',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new CoolifyApiError(`Coolify API request failed: ${reason}`, undefined, true);
    }
  }
}
