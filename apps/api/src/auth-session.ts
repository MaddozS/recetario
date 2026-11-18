import type { Handler } from 'hono';
import { auth } from '@recetario/auth/server';
import { getUserPreferences, createUserPreferences, getCredentialAccount } from '@recetario/db';
import { getDefaultSubscription } from '@recetario/stripe';
import { getSubscriptionInfo } from '@recetario/stripe/server';

const DEFAULT_THEME = 'system' as const;
const DEFAULT_ACCENT = 'coral' as const;

async function resolveUserSubscription(userId: string) {
  return (await getSubscriptionInfo(userId)) ?? getDefaultSubscription();
}

export function authSessionHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json(null);
    }

    const userId = session.user.id;
    const [existingPrefs, subscription, credentialAccount] = await Promise.all([
      getUserPreferences(userId),
      resolveUserSubscription(userId),
      getCredentialAccount(userId),
    ]);

    const prefs =
      existingPrefs ??
      (await createUserPreferences(userId, {
        theme: DEFAULT_THEME,
        accentColor: DEFAULT_ACCENT,
      }));

    return c.json({
      ...session,
      preferences: {
        userId: prefs.userId,
        theme: prefs.theme,
        accentColor: prefs.accentColor,
      },
      subscription,
      hasPasswordAuth: credentialAccount !== null,
    });
  };
}
