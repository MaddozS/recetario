export const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'PUBLIC_APP_URL',
  'RECIPES_STATIC_OWNER_EMAIL',
  'RECIPES_STATIC_OWNER_ID',
  'RESEND_API_KEY',
  'SENDER_EMAIL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'WEB_ORIGIN',
] as const;

export function syncEnvBindings(bindings: Record<string, unknown>): void {
  for (const key of REQUIRED_ENV_KEYS) {
    const value = bindings[key];
    if (typeof value === 'string' && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

console.assert(REQUIRED_ENV_KEYS.length === 13, 'REQUIRED_ENV_KEYS length mismatch');
