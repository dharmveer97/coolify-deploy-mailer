import { z } from 'zod';

/**
 * The fields we use from `GET /api/v1/deployments/{uuid}`. Unknown fields (logs, ids, …) are
 * dropped. These values, not the webhook body, decide what the email says.
 */
export const coolifyDeploymentSchema = z.object({
  deployment_uuid: z.string(),
  status: z.string(),
  application_name: z.string().nullish(),
  deployment_url: z.string().nullish(),
  commit: z.string().nullish(),
  commit_message: z.string().nullish(),
  pull_request_id: z.coerce.number().int().nullish(),
  application: z.object({ uuid: z.string() }).nullish(),
});

/** The fields we use from `GET /api/v1/applications/{uuid}`. Unknown fields are dropped. */
export const coolifyApplicationSchema = z.object({
  uuid: z.string(),
  name: z.string().nullish(),
  fqdn: z.string().nullish(),
  git_repository: z.string().nullish(),
  git_branch: z.string().nullish(),
});
