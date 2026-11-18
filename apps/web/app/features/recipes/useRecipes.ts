import { canCreateRecipe } from '@recetario/stripe/subscription';
import {
  ingredientUsageMapSchema,
  recipeSummarySchema,
  recipeWithIngredientsSchema,
} from '@recetario/types';
import { z } from 'zod';
import { filterRecipes, recipeCategoryOptions, uncategorizedCount } from './recipe-filters';
import { isRecipeFormValid, toRecipeInput } from './recipe-form';
import type { RecipeFormValues } from './recipe-form';
import { recipeLimitMessage, resolveRecipeMutationError } from './recipe-messages';
import { recentRecipes, recipeStats } from './recipe-stats';
import { emptyRecipesSnapshot, toRecipeSummary, withCreated, withRemoved } from './recipe-state';
import type { RecipeRecord, RecipesSnapshot } from './recipe-state';

/**
 * Datos y mutaciones del listado de recetas.
 *
 * La instantánea (recetas + ingredientes usados) llega del SSR en una sola
 * llamada y se muta en sitio con los reducers puros: crear, duplicar y eliminar
 * no recargan la página. Crear y duplicar navegan después en cliente a
 * `/recipes/{id}?edit=true` (paridad con el baseline), así que el reducer corre antes
 * de salir para que el listado siga siendo correcto al volver.
 *
 * El filtro por categoría vive en la URL (`?category=`), de modo que el
 * back/forward lo resuelve el router sin refetch ni perder la búsqueda. El gate
 * de plan se anticipa con `canCreateRecipe`; Hono sigue siendo la autoridad y su
 * `PLAN_LIMIT` se mapea al mismo mensaje.
 */
export type MutationOutcome =
  | { ok: true; id: number }
  | { ok: false; message: string; planLimit?: boolean };

export type RecipeMutation = 'create' | 'duplicate' | 'delete';

type RecipeDetailRecord = z.infer<typeof recipeWithIngredientsSchema>;

type RecipesPageData = {
  snapshot: RecipesSnapshot;
  failed: boolean;
};

const BUSY_OUTCOME: MutationOutcome = {
  ok: false,
  message: 'Ya hay una operación en curso. Espera a que termine.',
};

const OVERLAY_MESSAGES: Record<RecipeMutation, string> = {
  create: 'Creando receta…',
  duplicate: 'Duplicando receta…',
  delete: 'Eliminando receta…',
};

export function useRecipes() {
  const api = useApi();
  const { subscription } = useAuth();
  const route = useRoute();
  const overlay = useState<string | null>('loading-overlay', () => null);

  const {
    data,
    pending: loading,
    refresh,
  } = useAsyncData<RecipesPageData>(
    'recipes',
    async () => {
      try {
        const [recipes, usage] = await Promise.all([
          api<RecipeRecord[]>('/api/recipes', {
            schema: z.array(recipeSummarySchema),
          }),
          api('/api/ingredients/usage', { schema: ingredientUsageMapSchema }),
        ]);

        return {
          snapshot: {
            recipes,
            usedIngredientCount: Object.keys(usage).length,
          },
          failed: false,
        };
      } catch (cause) {
        console.error('[recipes] no se pudo cargar la página', cause);
        return { snapshot: emptyRecipesSnapshot(), failed: true };
      }
    },
    {
      default: () => ({
        snapshot: emptyRecipesSnapshot(),
        failed: false,
      }),
    }
  );

  const snapshot = computed(() => data.value.snapshot);
  const recipes = computed(() => snapshot.value.recipes);
  const loadFailed = computed(() => data.value.failed);

  const searchQuery = ref('');

  /** `null` = todas, `""` = sin categoría (paridad con `?category=` del baseline). */
  const category = computed<string | null>(() => {
    const value = route.query.category;
    return typeof value === 'string' ? value : null;
  });

  const filteredRecipes = computed(() =>
    filterRecipes(recipes.value, {
      query: searchQuery.value,
      category: category.value,
    })
  );
  const categoryOptions = computed(() => recipeCategoryOptions(recipes.value));
  const uncategorizedTotal = computed(() => uncategorizedCount(recipes.value));
  const stats = computed(() => recipeStats(recipes.value, snapshot.value.usedIngredientCount));
  const recent = computed(() => recentRecipes(recipes.value));

  function selectCategory(next: string | null): void {
    void navigateTo({
      path: '/recipes',
      query: next === null ? {} : { category: next },
    });
  }

  function applySnapshot(next: RecipesSnapshot): void {
    data.value = { ...data.value, snapshot: next, failed: false };
  }

  const mutation = ref<RecipeMutation | null>(null);

  function beginMutation(action: RecipeMutation): (() => void) | null {
    if (mutation.value !== null) return null;

    mutation.value = action;
    overlay.value = OVERLAY_MESSAGES[action];

    return () => {
      mutation.value = null;
      overlay.value = null;
    };
  }

  async function createRecipe(values: RecipeFormValues): Promise<MutationOutcome> {
    const plan = subscription.value;
    if (plan && !canCreateRecipe(plan, recipes.value.length)) {
      return {
        ok: false,
        message: recipeLimitMessage(plan.recipesLimit),
        planLimit: true,
      };
    }

    if (!isRecipeFormValid(values)) {
      return {
        ok: false,
        message: 'Escribe un nombre de hasta 120 caracteres.',
      };
    }

    const finish = beginMutation('create');
    if (!finish) return BUSY_OUTCOME;

    try {
      const created = await api<RecipeDetailRecord>('/api/recipes', {
        method: 'POST',
        body: toRecipeInput(values),
        schema: recipeWithIngredientsSchema,
      });
      applySnapshot(withCreated(snapshot.value, toRecipeSummary(created)));
      return { ok: true, id: created.id };
    } catch (cause) {
      return {
        ok: false,
        ...resolveRecipeMutationError(cause, {
          action: 'create',
          limit: plan?.recipesLimit ?? null,
        }),
      };
    } finally {
      finish();
    }
  }

  async function duplicateRecipe(recipeId: number): Promise<MutationOutcome> {
    const finish = beginMutation('duplicate');
    if (!finish) return BUSY_OUTCOME;

    try {
      const duplicated = await api<RecipeDetailRecord>(`/api/recipes/${recipeId}/duplicate`, {
        method: 'POST',
        schema: recipeWithIngredientsSchema,
      });
      applySnapshot(withCreated(snapshot.value, toRecipeSummary(duplicated)));
      return { ok: true, id: duplicated.id };
    } catch (cause) {
      return {
        ok: false,
        ...resolveRecipeMutationError(cause, {
          action: 'duplicate',
          limit: subscription.value?.recipesLimit ?? null,
        }),
      };
    } finally {
      finish();
    }
  }

  async function removeRecipe(recipeId: number): Promise<MutationOutcome> {
    const finish = beginMutation('delete');
    if (!finish) return BUSY_OUTCOME;

    try {
      await api(`/api/recipes/${recipeId}`, { method: 'DELETE' });
      applySnapshot(withRemoved(snapshot.value, recipeId));
      return { ok: true, id: recipeId };
    } catch (cause) {
      return {
        ok: false,
        ...resolveRecipeMutationError(cause, {
          action: 'delete',
          limit: subscription.value?.recipesLimit ?? null,
        }),
      };
    } finally {
      finish();
    }
  }

  return {
    recipes,
    loading,
    loadFailed,
    refresh,
    searchQuery,
    category,
    filteredRecipes,
    categoryOptions,
    uncategorizedTotal,
    stats,
    recent,
    mutation,
    selectCategory,
    createRecipe,
    duplicateRecipe,
    removeRecipe,
  };
}
