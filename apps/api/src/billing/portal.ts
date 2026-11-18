import type { Handler } from 'hono';
import { getStripeCustomerId } from '@recetario/db';
import { createPortalSession } from '@recetario/stripe/server';
import type { AuthVariables } from '../middleware/auth';
import { ApiError } from '../errors';
import { getAppOrigin } from '../url-utils';

export function stripePortalHandler(): Handler<{ Variables: AuthVariables }> {
  return async (c) => {
    const user = c.get('user');

    const customerId = await getStripeCustomerId(user.id);
    if (!customerId) throw new ApiError('NOT_FOUND', 'No subscription found');
    const appOrigin = getAppOrigin(c);
    const portalSession = await createPortalSession(
      customerId,
      `${appOrigin}/settings?tab=billing`
    );
    return c.json({ url: portalSession.url });
  };
}
