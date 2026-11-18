import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { envelope } from '../envelope';
import { errorHandler } from '../error-handler';

const {
  mockGetSession,
  mockAuth,
  mockCreatePresentationFixedCost,
  mockUpdatePresentationFixedCost,
  mockDeletePresentationFixedCost,
} = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockCreatePresentationFixedCost = vi.fn();
  const mockUpdatePresentationFixedCost = vi.fn();
  const mockDeletePresentationFixedCost = vi.fn();
  return {
    mockGetSession,
    mockAuth,
    mockCreatePresentationFixedCost,
    mockUpdatePresentationFixedCost,
    mockDeletePresentationFixedCost,
  };
});

vi.mock('@recetario/auth/server', () => ({
  auth: mockAuth,
}));

vi.mock('@recetario/db', () => ({
  createPresentationFixedCost: (pid: number, ownerId: string, input: unknown) =>
    mockCreatePresentationFixedCost(pid, ownerId, input),
  updatePresentationFixedCost: (pid: number, fcid: number, ownerId: string, input: unknown) =>
    mockUpdatePresentationFixedCost(pid, fcid, ownerId, input),
  deletePresentationFixedCost: (pid: number, fcid: number, ownerId: string) =>
    mockDeletePresentationFixedCost(pid, fcid, ownerId),
}));

const {
  presentationsFixedCostsCreateHandler,
  presentationsFixedCostsUpdateHandler,
  presentationsFixedCostsDeleteHandler,
} = await import('./fixed-costs');

const sessionFixture = {
  user: { id: 'user-1', email: 'ada@example.com' },
  session: { id: 'sess-1', userId: 'user-1' },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use('*', envelope());
  app.post('/api/presentations/:pid/fixed-costs', presentationsFixedCostsCreateHandler());
  app.patch('/api/presentations/:pid/fixed-costs/:fcid', presentationsFixedCostsUpdateHandler());
  app.delete('/api/presentations/:pid/fixed-costs/:fcid', presentationsFixedCostsDeleteHandler());
  return app;
}

describe('presentationsFixedCostsCreateHandler', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockCreatePresentationFixedCost.mockReset();
  });

  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request('/api/presentations/5/fixed-costs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'AMOUNT', base: 'PER_BATCH', value: 5 }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when the presentation is not owned', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockCreatePresentationFixedCost.mockResolvedValueOnce(null);

    const res = await buildApp().request('/api/presentations/99/fixed-costs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'AMOUNT', base: 'PER_BATCH', value: 5 }),
    });
    expect(res.status).toBe(404);
    expect(mockCreatePresentationFixedCost).toHaveBeenCalled();
  });

  it('creates a fixed cost on an owned presentation', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockCreatePresentationFixedCost.mockResolvedValueOnce({
      id: 7,
      presentationId: 5,
      name: 'Empaque',
      type: 'AMOUNT',
      base: 'PER_UNIT',
      value: 1.5,
    });

    const res = await buildApp().request('/api/presentations/5/fixed-costs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Empaque', type: 'AMOUNT', base: 'PER_UNIT', value: 1.5 }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; presentationId: number; name: string };
    expect(body.id).toBe(7);
    expect(body.presentationId).toBe(5);
  });

  it('returns 400 on invalid body', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);

    const res = await buildApp().request('/api/presentations/5/fixed-costs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'AMOUNT' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('presentationsFixedCostsUpdateHandler', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockUpdatePresentationFixedCost.mockReset();
  });

  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request('/api/presentations/5/fixed-costs/7', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when the fixed cost is not owned', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockUpdatePresentationFixedCost.mockResolvedValueOnce(null);

    const res = await buildApp().request('/api/presentations/5/fixed-costs/7', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    });
    expect(res.status).toBe(404);
    expect(mockUpdatePresentationFixedCost).toHaveBeenCalled();
  });

  it('updates a fixed cost on an owned presentation', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockUpdatePresentationFixedCost.mockResolvedValueOnce({
      id: 7,
      presentationId: 5,
      name: 'Empaque mod',
      type: 'AMOUNT',
      base: 'PER_UNIT',
      value: 2,
    });

    const res = await buildApp().request('/api/presentations/5/fixed-costs/7', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Empaque mod', value: 2 }),
    });
    expect(res.status).toBe(200);
    expect(mockUpdatePresentationFixedCost).toHaveBeenCalledWith(5, 7, 'user-1', {
      name: 'Empaque mod',
      value: 2,
    });
  });

  it('returns 400 when the body has no fields', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);

    const res = await buildApp().request('/api/presentations/5/fixed-costs/7', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe('presentationsFixedCostsDeleteHandler', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockDeletePresentationFixedCost.mockReset();
  });

  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request('/api/presentations/5/fixed-costs/7', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when the fixed cost is not owned', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockDeletePresentationFixedCost.mockResolvedValueOnce({ status: 'not-found' });

    const res = await buildApp().request('/api/presentations/5/fixed-costs/7', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
    expect(mockDeletePresentationFixedCost).toHaveBeenCalledWith(5, 7, 'user-1');
  });

  it('deletes a fixed cost on an owned presentation', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockDeletePresentationFixedCost.mockResolvedValueOnce({ status: 'deleted' });

    const res = await buildApp().request('/api/presentations/5/fixed-costs/7', {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
    expect(mockDeletePresentationFixedCost).toHaveBeenCalledWith(5, 7, 'user-1');
  });
});
