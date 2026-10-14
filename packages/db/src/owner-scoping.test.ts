import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  type Tx = {
    recipe: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    recipeIngredient: { create: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
    recipeFixedCost: { create: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
    recipePresentation: {
      create: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  const tx: Tx = {
    recipe: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    recipeIngredient: { create: vi.fn(), deleteMany: vi.fn() },
    recipeFixedCost: { create: vi.fn(), deleteMany: vi.fn() },
    recipePresentation: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  const prisma = {
    $transaction: vi.fn((fn: (tx: Tx) => unknown) => fn(tx)),
    recipe: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    ingredient: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    recipeIngredient: { findMany: vi.fn() },
    recipePresentation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    recipeFixedCost: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    presentationFixedCost: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userPreferences: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    subscriptionPlan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    account: { findFirst: vi.fn(), updateMany: vi.fn() },
    user: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return { prisma, tx };
});

vi.mock('./prisma', () => ({
  prisma: mocks.prisma,
}));

import {
  getRecipeSummaries,
  getRecipe,
  getRecipesByIds,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  duplicateRecipe,
} from './recipes';
import {
  getIngredient,
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getIngredientUsage,
  getIngredientUsageRecipes,
} from './ingredients';
import {
  getPresentation,
  getPresentationsByRecipeId,
  createPresentation,
  updatePresentation,
  deletePresentation,
} from './presentations';
import {
  createRecipeFixedCost,
  updateRecipeFixedCost,
  deleteRecipeFixedCost,
  createPresentationFixedCost,
  updatePresentationFixedCost,
  deletePresentationFixedCost,
} from './fixed-costs';
import { getCredentialAccount, updateAccountPassword, updateUserName } from './infra';

const OWNER = 'owner-1';

beforeEach(() => {
  for (const model of Object.values(mocks.prisma)) {
    for (const method of Object.values(model as Record<string, unknown>)) {
      if (typeof method === 'function' && 'mockReset' in method) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }
  for (const model of Object.values(mocks.tx)) {
    for (const method of Object.values(model as Record<string, unknown>)) {
      if (typeof method === 'function' && 'mockReset' in method) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }
});

describe('recipes ownerId scoping', () => {
  it('getRecipeSummaries scopes by ownerId', async () => {
    mocks.prisma.recipe.findMany.mockResolvedValueOnce([]);
    await getRecipeSummaries(OWNER);
    expect(mocks.prisma.recipe.findMany).toHaveBeenCalledWith({
      where: { ownerId: OWNER },
      include: { recipeIngredients: true },
    });
  });

  it('getRecipe scopes by id and ownerId', async () => {
    mocks.prisma.recipe.findFirst.mockResolvedValueOnce(null);
    await getRecipe(5, OWNER);
    const arg = mocks.prisma.recipe.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.id).toBe(5);
    expect(arg.where.ownerId).toBe(OWNER);
  });

  it('getRecipesByIds scopes by ownerId', async () => {
    mocks.prisma.recipe.findMany.mockResolvedValueOnce([]);
    await getRecipesByIds([1, 2], OWNER);
    const arg = mocks.prisma.recipe.findMany.mock.calls[0]?.[0] as {
      where: { id: { in: number[] }; ownerId: string };
    };
    expect(arg.where.ownerId).toBe(OWNER);
    expect(arg.where.id.in).toEqual([1, 2]);
  });

  it('createRecipe sets ownerId on the created recipe and recipeId on children', async () => {
    mocks.tx.recipe.create.mockResolvedValueOnce({ id: 99 });
    mocks.tx.recipe.findUnique.mockResolvedValueOnce({
      id: 99,
      recipeIngredients: [],
      recipeFixedCosts: [],
      presentations: [],
    });
    await createRecipe(
      OWNER,
      {
        name: 'Tarta',
        desiredMargin: 30,
        fixedCostsPercentage: 10,
      },
      [{ ingredientId: 1, quantity: 200, unit: 'g' }]
    );
    const createArg = mocks.tx.recipe.create.mock.calls[0]?.[0] as { data: { ownerId: string } };
    expect(createArg.data.ownerId).toBe(OWNER);
    const childArg = mocks.tx.recipeIngredient.create.mock.calls[0]?.[0] as {
      data: { recipeId: number };
    };
    expect(childArg.data.recipeId).toBe(99);
  });

  it('updateRecipe scopes the update where by id and ownerId', async () => {
    mocks.tx.recipe.update.mockResolvedValueOnce({});
    await updateRecipe(5, { name: 'X' }, OWNER, []);
    const arg = mocks.tx.recipe.update.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.id).toBe(5);
    expect(arg.where.ownerId).toBe(OWNER);
  });

  it('deleteRecipe scopes the delete where by id and ownerId', async () => {
    mocks.prisma.recipe.delete.mockResolvedValueOnce({});
    await deleteRecipe(5, OWNER);
    const arg = mocks.prisma.recipe.delete.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.id).toBe(5);
    expect(arg.where.ownerId).toBe(OWNER);
  });

  it('duplicateRecipe loads the source scoped by ownerId', async () => {
    mocks.prisma.recipe.findFirst.mockResolvedValueOnce({
      id: 5,
      name: 'Tarta',
      category: null,
      desiredMargin: 30,
      fixedCostsPercentage: 10,
      recipeIngredients: [],
      recipeFixedCosts: [],
      presentations: [],
    });
    mocks.tx.recipe.create.mockResolvedValueOnce({ id: 6 });
    mocks.tx.recipe.findUnique.mockResolvedValueOnce({
      id: 6,
      recipeIngredients: [],
      recipeFixedCosts: [],
      presentations: [],
    });
    await duplicateRecipe(5, OWNER);
    const arg = mocks.prisma.recipe.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.ownerId).toBe(OWNER);
    const createArg = mocks.tx.recipe.create.mock.calls[0]?.[0] as { data: { ownerId: string } };
    expect(createArg.data.ownerId).toBe(OWNER);
  });
});

describe('ingredients ownerId scoping', () => {
  it('getIngredient scopes by id and ownerId', async () => {
    mocks.prisma.ingredient.findFirst.mockResolvedValueOnce(null);
    await getIngredient(7, OWNER);
    const arg = mocks.prisma.ingredient.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.id).toBe(7);
    expect(arg.where.ownerId).toBe(OWNER);
  });

  it('getIngredients scopes by ownerId', async () => {
    mocks.prisma.ingredient.findMany.mockResolvedValueOnce([]);
    await getIngredients(OWNER);
    expect(mocks.prisma.ingredient.findMany).toHaveBeenCalledWith({
      where: { ownerId: OWNER },
      orderBy: { id: 'asc' },
    });
  });

  it('createIngredient sets ownerId on the created row', async () => {
    mocks.prisma.ingredient.create.mockResolvedValueOnce({ id: 1 });
    await createIngredient({ name: 'Harina', unit: 'kg', price: 10, purchaseQuantity: 1 }, OWNER);
    const arg = mocks.prisma.ingredient.create.mock.calls[0]?.[0] as { data: { ownerId: string } };
    expect(arg.data.ownerId).toBe(OWNER);
  });

  it('updateIngredient scopes the update where by id and ownerId', async () => {
    mocks.prisma.ingredient.update.mockResolvedValueOnce({ id: 7 });
    await updateIngredient(7, { name: 'Harina' }, OWNER);
    const arg = mocks.prisma.ingredient.update.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.id).toBe(7);
    expect(arg.where.ownerId).toBe(OWNER);
  });

  it('deleteIngredient scopes the usage check and delete by ownerId', async () => {
    mocks.prisma.recipeIngredient.findMany.mockResolvedValueOnce([]);
    mocks.prisma.ingredient.delete.mockResolvedValueOnce({});
    await deleteIngredient(7, OWNER);
    const usageArg = mocks.prisma.recipeIngredient.findMany.mock.calls[0]?.[0] as {
      where: { ingredientId: number; recipe: { ownerId: string } };
    };
    expect(usageArg.where.recipe.ownerId).toBe(OWNER);
    const delArg = mocks.prisma.ingredient.delete.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(delArg.where.ownerId).toBe(OWNER);
  });

  it('getIngredientUsage scopes by ownerId via nested recipe', async () => {
    mocks.prisma.recipeIngredient.findMany.mockResolvedValueOnce([]);
    await getIngredientUsage(OWNER);
    const arg = mocks.prisma.recipeIngredient.findMany.mock.calls[0]?.[0] as {
      where: { recipe: { ownerId: string } };
    };
    expect(arg.where.recipe.ownerId).toBe(OWNER);
  });

  it('getIngredientUsageRecipes scopes by ownerId via nested recipe', async () => {
    mocks.prisma.recipeIngredient.findMany.mockResolvedValueOnce([]);
    await getIngredientUsageRecipes(7, OWNER);
    const arg = mocks.prisma.recipeIngredient.findMany.mock.calls[0]?.[0] as {
      where: { ingredientId: number; recipe: { ownerId: string } };
    };
    expect(arg.where.recipe.ownerId).toBe(OWNER);
  });
});

describe('presentations ownerId scoping', () => {
  it('getPresentation scopes by id and ownerId via nested recipe', async () => {
    mocks.prisma.recipePresentation.findFirst.mockResolvedValueOnce(null);
    await getPresentation(10, OWNER);
    const arg = mocks.prisma.recipePresentation.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; recipe: { ownerId: string } };
    };
    expect(arg.where.id).toBe(10);
    expect(arg.where.recipe.ownerId).toBe(OWNER);
  });

  it('getPresentationsByRecipeId scopes by ownerId via nested recipe', async () => {
    mocks.prisma.recipePresentation.findMany.mockResolvedValueOnce([]);
    await getPresentationsByRecipeId(1, OWNER);
    const arg = mocks.prisma.recipePresentation.findMany.mock.calls[0]?.[0] as {
      where: { recipeId: number; recipe: { ownerId: string } };
    };
    expect(arg.where.recipeId).toBe(1);
    expect(arg.where.recipe.ownerId).toBe(OWNER);
  });

  it('createPresentation verifies the recipe is owned before creating', async () => {
    mocks.prisma.recipe.findFirst.mockResolvedValueOnce(null);
    await expect(
      createPresentation(1, OWNER, { name: 'Docena', unitsPerBatch: 12 })
    ).rejects.toThrow('Recipe not found');
    const arg = mocks.prisma.recipe.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.ownerId).toBe(OWNER);
  });

  it('updatePresentation verifies the recipe is owned before updating', async () => {
    mocks.prisma.recipe.findFirst.mockResolvedValueOnce({ id: 1 });
    mocks.tx.recipePresentation.update.mockResolvedValueOnce({ id: 10 });
    mocks.tx.recipePresentation.findUnique.mockResolvedValueOnce({ id: 10, fixedCosts: [] });
    mocks.tx.recipe.update.mockResolvedValueOnce({});
    await updatePresentation(10, 1, OWNER, { name: 'X' });
    const arg = mocks.prisma.recipe.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.ownerId).toBe(OWNER);
    const updArg = mocks.tx.recipePresentation.update.mock.calls[0]?.[0] as {
      where: { id: number; recipeId: number };
    };
    expect(updArg.where.id).toBe(10);
    expect(updArg.where.recipeId).toBe(1);
  });

  it('deletePresentation verifies the recipe is owned before deleting', async () => {
    mocks.prisma.recipe.findFirst.mockResolvedValueOnce(null);
    const res = await deletePresentation(1, 10, OWNER);
    expect(res.status).toBe('not-found');
    const arg = mocks.prisma.recipe.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.ownerId).toBe(OWNER);
  });
});

describe('fixed costs ownerId scoping', () => {
  it('createRecipeFixedCost verifies recipe ownership', async () => {
    mocks.prisma.recipe.findFirst.mockResolvedValueOnce(null);
    const res = await createRecipeFixedCost(1, OWNER, {
      name: 'Luz',
      type: 'AMOUNT',
      base: 'PER_BATCH',
      value: 10,
    });
    expect(res).toBeNull();
    const arg = mocks.prisma.recipe.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; ownerId: string };
    };
    expect(arg.where.ownerId).toBe(OWNER);
  });

  it('updateRecipeFixedCost scopes the lookup by ownerId', async () => {
    mocks.prisma.recipeFixedCost.findFirst.mockResolvedValueOnce(null);
    const res = await updateRecipeFixedCost(1, 7, OWNER, { name: 'X' });
    expect(res).toBeNull();
    const arg = mocks.prisma.recipeFixedCost.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; recipeId: number; recipe: { ownerId: string } };
    };
    expect(arg.where.recipe.ownerId).toBe(OWNER);
  });

  it('deleteRecipeFixedCost scopes the lookup by ownerId', async () => {
    mocks.prisma.recipeFixedCost.findFirst.mockResolvedValueOnce(null);
    const res = await deleteRecipeFixedCost(1, 7, OWNER);
    expect(res.status).toBe('not-found');
    const arg = mocks.prisma.recipeFixedCost.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; recipeId: number; recipe: { ownerId: string } };
    };
    expect(arg.where.recipe.ownerId).toBe(OWNER);
  });

  it('createPresentationFixedCost verifies presentation ownership', async () => {
    mocks.prisma.recipePresentation.findFirst.mockResolvedValueOnce(null);
    const res = await createPresentationFixedCost(5, OWNER, {
      name: 'Empaque',
      type: 'AMOUNT',
      base: 'PER_UNIT',
      value: 1,
    });
    expect(res).toBeNull();
    const arg = mocks.prisma.recipePresentation.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; recipe: { ownerId: string } };
    };
    expect(arg.where.recipe.ownerId).toBe(OWNER);
  });

  it('updatePresentationFixedCost scopes the lookup by ownerId', async () => {
    mocks.prisma.presentationFixedCost.findFirst.mockResolvedValueOnce(null);
    const res = await updatePresentationFixedCost(5, 7, OWNER, { name: 'X' });
    expect(res).toBeNull();
    const arg = mocks.prisma.presentationFixedCost.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; presentationId: number; presentation: { recipe: { ownerId: string } } };
    };
    expect(arg.where.presentation.recipe.ownerId).toBe(OWNER);
  });

  it('deletePresentationFixedCost scopes the lookup by ownerId', async () => {
    mocks.prisma.presentationFixedCost.findFirst.mockResolvedValueOnce(null);
    const res = await deletePresentationFixedCost(5, 7, OWNER);
    expect(res.status).toBe('not-found');
    const arg = mocks.prisma.presentationFixedCost.findFirst.mock.calls[0]?.[0] as {
      where: { id: number; presentationId: number; presentation: { recipe: { ownerId: string } } };
    };
    expect(arg.where.presentation.recipe.ownerId).toBe(OWNER);
  });
});

describe('infra ownerId scoping', () => {
  it('getCredentialAccount scopes by userId and provider', async () => {
    mocks.prisma.account.findFirst.mockResolvedValueOnce(null);
    await getCredentialAccount('user-1');
    const arg = mocks.prisma.account.findFirst.mock.calls[0]?.[0] as {
      where: { userId: string; providerId: string };
    };
    expect(arg.where.userId).toBe('user-1');
    expect(arg.where.providerId).toBe('credential');
  });

  it('updateAccountPassword scopes by userId and provider', async () => {
    mocks.prisma.account.updateMany.mockResolvedValueOnce({ count: 1 });
    await updateAccountPassword('user-1', 'credential', 'hash');
    const arg = mocks.prisma.account.updateMany.mock.calls[0]?.[0] as {
      where: { userId: string; providerId: string };
    };
    expect(arg.where.userId).toBe('user-1');
    expect(arg.where.providerId).toBe('credential');
  });

  it('updateUserName updates by userId', async () => {
    mocks.prisma.user.update.mockResolvedValueOnce({});
    await updateUserName('user-1', { firstName: 'Ada', lastName: 'Lovelace' });
    const arg = mocks.prisma.user.update.mock.calls[0]?.[0] as { where: { id: string } };
    expect(arg.where.id).toBe('user-1');
  });
});
