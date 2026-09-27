import type { ReactElement } from 'react';
import { previewDeploymentData } from '@/emails/previews/preview-data';
import { DeploymentEmail } from '@/emails/templates/deployment-email';

/** Preview for `npm run email:dev`. Default export + PreviewProps is what the CLI expects. */
export default function DeploymentSuccessPreview(): ReactElement {
  return <DeploymentEmail data={previewDeploymentData({ success: true })} />;
}
