import type { Handler } from 'hono';
import { createRecipeFixedCost, updateRecipeFixedCost, deleteRecipeFixedCost } from '@recetario/db';
import { auth } from '@recetario/auth/server';
import { fixedCostCreateSchema, fixedCostUpdateSchema } from '@recetario/types';
import { ApiError } from '../errors';

export function fixedCostsCreateHandler(): Handler {
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

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Invalid JSON body');
    }

    const parsed = fixedCostCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid fixed cost input');
    }

    const created = await createRecipeFixedCost(recipeId, session.user.id, {
      name: parsed.data.name ?? 'Costo Fijo',
      type: parsed.data.type,
      base: parsed.data.base,
      value: parsed.data.value,
      hours: parsed.data.hours ?? null,
    });
    if (!created) {
      throw new ApiError('NOT_FOUND', 'Recipe not found');
    }

    return c.json(
      {
        id: created.id,
        recipeId: created.recipeId,
        name: created.name,
        type: created.type,
        base: created.base,
        value: created.value,
        hours: created.hours,
      },
      201
    );
  };
}

export function fixedCostsUpdateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    }

    const recipeId = Number(c.req.param('id'));
    const fid = Number(c.req.param('fid'));
    if (!Number.isFinite(recipeId) || !Number.isFinite(fid)) {
      throw new ApiError('NOT_FOUND', 'Fixed cost not found');
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'Invalid JSON body');
    }

    const parsed = fixedCostUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid fixed cost input');
    }

    const updated = await updateRecipeFixedCost(recipeId, fid, session.user.id, {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.type !== undefined && { type: parsed.data.type }),
      ...(parsed.data.base !== undefined && { base: parsed.data.base }),
      ...(parsed.data.value !== undefined && { value: parsed.data.value }),
      ...(parsed.data.hours !== undefined && { hours: parsed.data.hours }),
    });
    if (!updated) {
      throw new ApiError('NOT_FOUND', 'Fixed cost not found');
    }

    return c.json({
      id: updated.id,
      recipeId: updated.recipeId,
      name: updated.name,
      type: updated.type,
      base: updated.base,
      value: updated.value,
      hours: updated.hours,
    });
  };
}

export function fixedCostsDeleteHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    }

    const recipeId = Number(c.req.param('id'));
    const fid = Number(c.req.param('fid'));
    if (!Number.isFinite(recipeId) || !Number.isFinite(fid)) {
      throw new ApiError('NOT_FOUND', 'Fixed cost not found');
    }

    const result = await deleteRecipeFixedCost(recipeId, fid, session.user.id);
    if (result.status === 'not-found') {
      throw new ApiError('NOT_FOUND', 'Fixed cost not found');
    }

    return c.body(null, 204);
  };
}
