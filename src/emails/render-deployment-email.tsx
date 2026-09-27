import { render } from 'react-email';
import { buildSubject } from '@/emails/deployment-email-content';
import { DeploymentEmail } from '@/emails/templates/deployment-email';
import { renderDeploymentEmailText } from '@/emails/templates/deployment-email-text';
import type { DeploymentEmailData, RenderedEmail } from '@/types/email.types';

/** Render the subject, the HTML part (React Email) and the plain-text part. */
export async function renderDeploymentEmail(data: DeploymentEmailData): Promise<RenderedEmail> {
  return {
    subject: buildSubject(data),
    html: await render(<DeploymentEmail data={data} />),
    text: renderDeploymentEmailText(data),
  };
}
