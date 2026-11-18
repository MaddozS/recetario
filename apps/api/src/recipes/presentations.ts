import type { Handler } from 'hono';
import {
  getPresentationsByRecipeId,
  createPresentation,
  updatePresentation,
  deletePresentation,
} from '@recetario/db';
import { auth } from '@recetario/auth/server';
import { presentationCreateSchema, presentationUpdateSchema } from '@recetario/types';
import { ApiError } from '../errors';

export function presentationsListHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    }

    const idParam = c.req.param('id');
    const recipeId = Number(idParam);
    if (!Number.isFinite(recipeId)) {
      throw new ApiError('NOT_FOUND', 'Recipe not found');
    }

    const presentations = await getPresentationsByRecipeId(recipeId, session.user.id);
    if (!presentations) {
      throw new ApiError('NOT_FOUND', 'Recipe not found');
    }

    return c.json(
      presentations.map((p) => ({
        id: p.id,
        name: p.name,
        unitsPerBatch: p.unitsPerBatch,
        salePrice: p.salePrice,
        fixedCosts: p.fixedCosts.map((fc) => ({
          id: fc.id,
          presentationId: fc.presentationId,
          name: fc.name,
          type: fc.type,
          base: fc.base,
          value: fc.value,
        })),
      }))
    );
  };
}

function shapePresentation(p: {
  id: number;
  name: string;
  unitsPerBatch: unknown;
  salePrice: number | null;
}) {
  return {
    id: p.id,
    recipeId: undefined as number | undefined,
    name: p.name,
    unitsPerBatch: Number(p.unitsPerBatch),
    salePrice: p.salePrice === null ? null : Number(p.salePrice),
  };
}

export function presentationsCreateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    }

    const recipeId = Number(c.req.param('id'));
    if (!Number.isFinite(recipeId)) {
      throw new ApiError('NOT_FOUND', 'Recipe not found');
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Invalid JSON body');
    }
    const parsed = presentationCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid presentation input');
    }

    const created = await createPresentation(recipeId, session.user.id, {
      name: parsed.data.name,
      unitsPerBatch: parsed.data.unitsPerBatch,
      salePrice: parsed.data.salePrice ?? null,
    });
    if (!created) {
      throw new ApiError('NOT_FOUND', 'Recipe not found');
    }

    const shaped = shapePresentation(created);
    shaped.recipeId = recipeId;
    return c.json(shaped, 201);
  };
}

export function presentationsUpdateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    }

    const recipeId = Number(c.req.param('id'));
    const pid = Number(c.req.param('pid'));
    if (!Number.isFinite(recipeId) || !Number.isFinite(pid)) {
      throw new ApiError('NOT_FOUND', 'Presentation not found');
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Invalid JSON body');
    }
    const parsed = presentationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid presentation input');
    }

    const updated = await updatePresentation(pid, recipeId, session.user.id, {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.unitsPerBatch !== undefined && {
        unitsPerBatch: parsed.data.unitsPerBatch,
      }),
      ...(parsed.data.salePrice !== undefined && {
        salePrice: parsed.data.salePrice,
      }),
    });
    if (!updated) {
      throw new ApiError('NOT_FOUND', 'Presentation not found');
    }

    const shaped = shapePresentation(updated);
    shaped.recipeId = recipeId;
    return c.json(shaped);
  };
}

export function presentationsDeleteHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    }

    const recipeId = Number(c.req.param('id'));
    const pid = Number(c.req.param('pid'));
    if (!Number.isFinite(recipeId) || !Number.isFinite(pid)) {
      throw new ApiError('NOT_FOUND', 'Presentation not found');
    }

    const result = await deletePresentation(recipeId, pid, session.user.id);
    if (result.status === 'not-found') {
      throw new ApiError('NOT_FOUND', 'Presentation not found');
    }

    return c.body(null, 204);
  };
}
