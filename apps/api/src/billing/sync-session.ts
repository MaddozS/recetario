import type { Handler } from 'hono';
import { getCheckoutIntentBySession } from '@recetario/db';
import {
  retrieveCheckoutSession,
  retrieveSubscription,
  subscriptionIngestion,
} from '@recetario/stripe/server';
import { getAuthUser } from '../middleware/auth';
import type { AuthVariables } from '../middleware/auth';
import { ApiError } from '../errors';

export function syncCheckoutSessionHandler(): Handler<{ Variables: AuthVariables }> {
  return async (c) => {
    const user = await getAuthUser(c);
    let body: { sessionId?: string };
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Invalid request body');
    }

    const { sessionId } = body;
    if (!sessionId || typeof sessionId !== 'string') {
      throw new ApiError('VALIDATION_ERROR', 'Missing sessionId');
    }

    try {
      const session = await retrieveCheckoutSession(sessionId);
      if (!session || !session.subscription) {
        throw new ApiError('NOT_FOUND', 'No se encontró la sesión de pago.');
      }

      // Ownership authority: the authenticated user plus a trusted Checkout
      // intent. Metadata can corroborate but never override.
      const intent = await getCheckoutIntentBySession(session.id ?? sessionId);
      if (!intent || intent.userId !== user.id) {
        throw new ApiError('DOMAIN_ERROR', 'La sesión de pago ya no es válida.');
      }
      if (intent.state === 'pending' && intent.expiresAt < new Date()) {
        throw new ApiError('DOMAIN_ERROR', 'La sesión de pago ya no es válida.');
      }

      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
      const customerId =
        typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? '');

      // Retrieve the current Stripe state; the local plan resolves from the
      // Checkout intent, never from the requested Price alone.
      const sub = await retrieveSubscription(subscriptionId);
      const snapshot = subscriptionIngestion.snapshotFromSubscription(sub, customerId);

      const ingestResult = await subscriptionIngestion.ingestSubscriptionSnapshot({
        snapshot,
        metadata: (session.metadata as Record<string, string> | null) ?? null,
        context: { authority: 'checkout-intent', intent },
      });

      if (!ingestResult.ok) {
        console.error('[syncCheckoutSession] ingest failed:', ingestResult.error);
        throw new ApiError('INTERNAL', 'No se pudo sincronizar la suscripción.');
      }

      return c.json({ ok: true });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.error('[syncCheckoutSession] error:', err);
      throw new ApiError('INTERNAL', 'No se pudo sincronizar la suscripción.');
    }
  };
}
