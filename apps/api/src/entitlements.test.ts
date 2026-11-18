import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSubscriptionInfo, mockCountUserRecipes, mockCountUserIngredients } = vi.hoisted(
  () => ({
    mockGetSubscriptionInfo: vi.fn(),
    mockCountUserRecipes: vi.fn(),
    mockCountUserIngredients: vi.fn(),
  })
);

vi.mock('@recetario/stripe/server', () => ({
  getSubscriptionInfo: mockGetSubscriptionInfo,
}));

vi.mock('@recetario/db', () => ({
  countUserRecipes: mockCountUserRecipes,
  countUserIngredients: mockCountUserIngredients,
}));

const { requireFeature, requireIngredientCapacity, requireRecipeCapacity, resolveSubscription } =
  await import('./entitlements');

const userId = 'user-1';

function subscription(overrides: Record<string, unknown>) {
  return {
    tier: 'free',
    status: null,
    recipesLimit: 10,
    ingredientsLimit: 30,
    features: {},
    priceCents: null,
    currency: null,
    billingInterval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isTrial: false,
    trialEnd: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockGetSubscriptionInfo.mockResolvedValue(null);
  mockCountUserRecipes.mockResolvedValue(0);
  mockCountUserIngredients.mockResolvedValue(0);
});

describe('requireRecipeCapacity', () => {
  it('falls back to the free plan when there is no subscription row', async () => {
    mockCountUserRecipes.mockResolvedValueOnce(10);

    await expect(requireRecipeCapacity(userId)).rejects.toMatchObject({
      code: 'PLAN_LIMIT',
    });
    expect(mockCountUserRecipes).toHaveBeenCalledWith(userId);
  });

  it('passes when the user is below the limit', async () => {
    mockGetSubscriptionInfo.mockResolvedValueOnce(subscription({ recipesLimit: 10 }));
    mockCountUserRecipes.mockResolvedValueOnce(9);

    await expect(requireRecipeCapacity(userId)).resolves.toBeUndefined();
  });

  it('skips the count entirely for unlimited plans', async () => {
    mockGetSubscriptionInfo.mockResolvedValueOnce(subscription({ recipesLimit: null }));

    await expect(requireRecipeCapacity(userId)).resolves.toBeUndefined();
    expect(mockCountUserRecipes).not.toHaveBeenCalled();
  });

  it('reuses a pre-resolved subscription without querying again', async () => {
    const plan = subscription({ recipesLimit: 10 });
    mockCountUserRecipes.mockResolvedValueOnce(10);

    await expect(requireRecipeCapacity(userId, plan as never)).rejects.toMatchObject({
      code: 'PLAN_LIMIT',
    });
    expect(mockGetSubscriptionInfo).not.toHaveBeenCalled();
  });
});

describe('resolveSubscription', () => {
  it('falls back to the free plan', async () => {
    mockGetSubscriptionInfo.mockResolvedValueOnce(null);

    await expect(resolveSubscription(userId)).resolves.toMatchObject({
      tier: 'free',
      recipesLimit: 10,
      ingredientsLimit: 30,
    });
  });
});

describe('requireIngredientCapacity', () => {
  it('rejects when the free ingredient limit is reached', async () => {
    mockCountUserIngredients.mockResolvedValueOnce(30);

    await expect(requireIngredientCapacity(userId)).rejects.toMatchObject({
      code: 'PLAN_LIMIT',
    });
  });

  it('passes when the user is below the limit', async () => {
    mockCountUserIngredients.mockResolvedValueOnce(29);

    await expect(requireIngredientCapacity(userId)).resolves.toBeUndefined();
  });
});

describe('requireFeature', () => {
  it('rejects when the plan does not include the feature', async () => {
    mockGetSubscriptionInfo.mockResolvedValueOnce(
      subscription({ features: { recipe_duplicate: false } })
    );

    await expect(requireFeature(userId, 'recipe_duplicate')).rejects.toMatchObject({
      code: 'FEATURE_REQUIRED',
    });
  });

  it('passes when the plan includes the feature', async () => {
    mockGetSubscriptionInfo.mockResolvedValueOnce(
      subscription({ features: { recipe_duplicate: true } })
    );

    await expect(requireFeature(userId, 'recipe_duplicate')).resolves.toBeUndefined();
  });
});
