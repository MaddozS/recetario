type TestEnv = {
  DATABASE_URL: string;
  INTERNAL_API_HOST: string;
  BETTER_AUTH_SECRET: string;
  STRIPE_WEBHOOK_SECRET?: string;
  [k: string]: string | undefined;
};

export function createTestEnv(overrides: Partial<TestEnv> = {}): TestEnv {
  return {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    INTERNAL_API_HOST: 'localhost:8787',
    BETTER_AUTH_SECRET: 'test-secret-do-not-use-in-prod',
    ...overrides,
  };
}
