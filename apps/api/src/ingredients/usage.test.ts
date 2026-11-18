import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { envelope } from '../envelope';
import { errorHandler } from '../error-handler';

const { mockGetSession, mockAuth, mockGetIngredient, mockGetIngredientUsageRecipes } = vi.hoisted(
  () => {
    const mockGetSession = vi.fn();
    const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
    const mockGetIngredient = vi.fn();
    const mockGetIngredientUsageRecipes = vi.fn();
    return { mockGetSession, mockAuth, mockGetIngredient, mockGetIngredientUsageRecipes };
  }
);

vi.mock('@recetario/auth/server', () => ({
  auth: mockAuth,
}));

vi.mock('@recetario/db', () => ({
  getIngredient: (id: number, ownerId: string) => mockGetIngredient(id, ownerId),
  getIngredientUsageRecipes: (id: number, ownerId: string) =>
    mockGetIngredientUsageRecipes(id, ownerId),
}));

const { ingredientsUsageHandler } = await import('./usage');

const userId = 'user-1';
const sessionFixture = {
  user: { id: userId, email: 'a@b.c', name: 'A', image: null },
  session: { id: 's1', userId, token: 't1', expiresAt: new Date() },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use('*', envelope());
  app.get('/api/ingredients/:id/usage', ingredientsUsageHandler());
  return app;
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetIngredient.mockReset();
  mockGetIngredientUsageRecipes.mockReset();
  mockGetSession.mockResolvedValue(sessionFixture);
});

describe('ingredientsUsageHandler', () => {
  it('returns the recipes that use the ingredient', async () => {
    mockGetIngredient.mockResolvedValueOnce({ id: 7, ownerId: userId });
    mockGetIngredientUsageRecipes.mockResolvedValueOnce([
      { id: 10, name: 'Tarta' },
      { id: 11, name: 'Flan' },
    ]);

    const res = await buildApp().request('/api/ingredients/7/usage');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      recipes: Array<{ id: number; name: string }>;
    };
    expect(body.recipes).toEqual([
      { id: 10, name: 'Tarta' },
      { id: 11, name: 'Flan' },
    ]);
  });

  it('scopes both the ingredient and recipe lookups to the owner', async () => {
    mockGetIngredient.mockResolvedValueOnce({ id: 7, ownerId: userId });
    mockGetIngredientUsageRecipes.mockResolvedValueOnce([]);

    await buildApp().request('/api/ingredients/7/usage');

    expect(mockGetIngredient).toHaveBeenCalledWith(7, userId);
    expect(mockGetIngredientUsageRecipes).toHaveBeenCalledWith(7, userId);
  });

  it('returns 404 when the ingredient does not belong to the user', async () => {
    mockGetIngredient.mockResolvedValueOnce(null);

    const res = await buildApp().request('/api/ingredients/999/usage');
    expect(res.status).toBe(404);
    expect(mockGetIngredientUsageRecipes).not.toHaveBeenCalled();
  });

  it('returns an empty list when the ingredient is unused', async () => {
    mockGetIngredient.mockResolvedValueOnce({ id: 7, ownerId: userId });
    mockGetIngredientUsageRecipes.mockResolvedValueOnce([]);

    const res = await buildApp().request('/api/ingredients/7/usage');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recipes: unknown[] };
    expect(body.recipes).toEqual([]);
  });

  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request('/api/ingredients/7/usage');
    expect(res.status).toBe(401);
  });
});
