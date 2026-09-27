import type { ReactElement } from 'react';
import { previewDeploymentData } from '@/emails/previews/preview-data';
import { DeploymentEmail } from '@/emails/templates/deployment-email';

/** Preview for `npm run email:dev`. */
export default function DeploymentFailurePreview(): ReactElement {
  return <DeploymentEmail data={previewDeploymentData({ success: false })} />;
}
