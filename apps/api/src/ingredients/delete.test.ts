import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { envelope } from '../envelope';
import { errorHandler } from '../error-handler';

const { mockGetSession, mockAuth, mockDeleteIngredient } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockDeleteIngredient = vi.fn();
  return { mockGetSession, mockAuth, mockDeleteIngredient };
});

vi.mock('@recetario/auth/server', () => ({
  auth: mockAuth,
}));

vi.mock('@recetario/db', () => ({
  prisma: {},
  deleteIngredient: (id: number, ownerId: string) => mockDeleteIngredient(id, ownerId),
}));

const { ingredientsDeleteHandler } = await import('./delete');

const userId = 'user-1';
const sessionFixture = {
  user: { id: userId, email: 'a@b.c', name: 'A', image: null },
  session: { id: 's1', userId, token: 't1', expiresAt: new Date() },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use('*', envelope());
  app.delete('/api/ingredients/:id', ingredientsDeleteHandler());
  return app;
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockDeleteIngredient.mockReset();
  mockGetSession.mockResolvedValue(sessionFixture);
});

describe('ingredientsDeleteHandler', () => {
  it('returns 204 when the ingredient is not in use', async () => {
    mockDeleteIngredient.mockResolvedValueOnce({ status: 'deleted' });

    const res = await buildApp().request('/api/ingredients/7', {
      method: 'DELETE',
    });

    expect(res.status).toBe(204);
    expect(mockDeleteIngredient).toHaveBeenCalledWith(7, userId);
  });

  it('returns 409 with the recipe list when the ingredient is in use', async () => {
    mockDeleteIngredient.mockResolvedValueOnce({
      status: 'blocked',
      recipes: [
        { id: 10, name: 'Tarta de Chocolate', salePrice: 250 },
        { id: 11, name: 'Flan Casero', salePrice: null },
      ],
    });

    const res = await buildApp().request('/api/ingredients/7', {
      method: 'DELETE',
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string; reason: string };
      recipes: Array<{ id: number; name: string; salePrice: number | null }>;
    };
    expect(body.error.code).toBe('DOMAIN_ERROR');
    expect(body.error.reason).toBe('ingredient_in_use');
    expect(body.recipes).toHaveLength(2);
    expect(body.recipes[0]).toEqual({
      id: 10,
      name: 'Tarta de Chocolate',
      salePrice: 250,
    });
    expect(body.recipes[1]).toEqual({
      id: 11,
      name: 'Flan Casero',
      salePrice: null,
    });
  });

  it('returns 404 when the ingredient does not exist for the user', async () => {
    mockDeleteIngredient.mockResolvedValueOnce({ status: 'not-found' });

    const res = await buildApp().request('/api/ingredients/999', {
      method: 'DELETE',
    });

    expect(res.status).toBe(404);
  });

  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request('/api/ingredients/7', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });
});
