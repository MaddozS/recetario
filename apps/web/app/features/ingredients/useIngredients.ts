import { canCreateIngredient } from "@recetario/stripe/subscription";
import {
  ingredientSchema,
  ingredientUsageMapSchema,
  ingredientUsageResponseSchema,
  usageCountsResponseSchema,
} from "@recetario/types";
import type { IngredientUsageResponse } from "@recetario/types";
import { z } from "zod";
import { toIngredientInput, validateIngredientInput } from "./ingredient-form";
import type { IngredientFormValues } from "./ingredient-form";
import {
  ingredientLimitMessage,
  isIngredientInUse,
  resolveIngredientMutationError,
} from "./ingredient-messages";
import { filterIngredients } from "./ingredient-search";
import {
  emptyIngredientsSnapshot,
  withCreated,
  withRemoved,
  withUpdated,
} from "./ingredient-state";
import type { IngredientRecord, IngredientsSnapshot } from "./ingredient-state";

export type MutationOutcome =
  | { ok: true }
  | { ok: false; message: string; recipes?: string[]; planLimit?: boolean };

export type IngredientMutation = "create" | "update" | "delete";

type IngredientsPageData = {
  snapshot: IngredientsSnapshot;
  failed: boolean;
};

const BUSY_OUTCOME: MutationOutcome = {
  ok: false,
  message: "Ya hay una operación en curso. Espera a que termine.",
};

const OVERLAY_MESSAGES: Record<IngredientMutation, string> = {
  create: "Agregando insumo…",
  update: "Guardando cambios…",
  delete: "Eliminando insumo…",
};

/**
 * Datos y mutaciones del slice de ingredientes.
 *
 * La instantánea (lista + uso + contadores) llega del SSR en una sola llamada y
 * se muta en sitio con los reducers puros: crear/editar/eliminar no recargan la
 * página. El gate de plan se anticipa con `canCreateIngredient`; Hono sigue
 * siendo la autoridad y su `PLAN_LIMIT` se mapea al mismo mensaje.
 */
export function useIngredients() {
  const api = useApi();
  const { subscription } = useAuth();
  const overlay = useState<string | null>("loading-overlay", () => null);

  const {
    data,
    pending: loading,
    refresh,
  } = useAsyncData<IngredientsPageData>(
    "ingredients",
    async () => {
      try {
        const [ingredients, usage, counts] = await Promise.all([
          api<IngredientRecord[]>("/api/ingredients", {
            schema: z.array(ingredientSchema),
          }),
          api("/api/ingredients/usage", { schema: ingredientUsageMapSchema }),
          api("/api/usage-counts", { schema: usageCountsResponseSchema }),
        ]);

        return {
          snapshot: { ingredients, usage, counts },
          failed: false,
        };
      } catch (cause) {
        console.error("[ingredients] no se pudo cargar la página", cause);
        return { snapshot: emptyIngredientsSnapshot(), failed: true };
      }
    },
    {
      default: () => ({
        snapshot: emptyIngredientsSnapshot(),
        failed: false,
      }),
    },
  );

  const snapshot = computed(() => data.value.snapshot);
  const ingredients = computed(() => snapshot.value.ingredients);
  const usage = computed(() => snapshot.value.usage);
  const counts = computed(() => snapshot.value.counts);
  const loadFailed = computed(() => data.value.failed);

  const searchQuery = ref("");
  const filteredIngredients = computed(() =>
    filterIngredients(ingredients.value, searchQuery.value),
  );

  function usedRecipesFor(ingredientId: number): string[] {
    return usage.value[String(ingredientId)] ?? [];
  }

  function applySnapshot(next: IngredientsSnapshot): void {
    data.value = { ...data.value, snapshot: next, failed: false };
  }

  const mutation = ref<IngredientMutation | null>(null);

  function beginMutation(
    action: IngredientMutation,
    message: string,
  ): (() => void) | null {
    if (mutation.value !== null) return null;

    mutation.value = action;
    overlay.value = message;

    return () => {
      mutation.value = null;
      overlay.value = null;
    };
  }

  async function createIngredient(
    values: IngredientFormValues,
  ): Promise<MutationOutcome> {
    const plan = subscription.value;
    if (plan && !canCreateIngredient(plan, counts.value.ingredients)) {
      return {
        ok: false,
        message: ingredientLimitMessage(plan.ingredientsLimit),
        planLimit: true,
      };
    }

    const validation = validateIngredientInput(values);
    if (validation) return { ok: false, message: validation };

    const finish = beginMutation("create", OVERLAY_MESSAGES.create);
    if (!finish) return BUSY_OUTCOME;

    try {
      const created = await api<IngredientRecord>("/api/ingredients", {
        method: "POST",
        body: toIngredientInput(values),
        schema: ingredientSchema,
      });
      applySnapshot(withCreated(snapshot.value, created));
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        ...resolveIngredientMutationError(cause, {
          action: "create",
          limit: plan?.ingredientsLimit ?? null,
        }),
      };
    } finally {
      finish();
    }
  }

  async function updateIngredient(
    ingredientId: number,
    values: IngredientFormValues,
  ): Promise<MutationOutcome> {
    const validation = validateIngredientInput(values);
    if (validation) return { ok: false, message: validation };

    const finish = beginMutation("update", OVERLAY_MESSAGES.update);
    if (!finish) return BUSY_OUTCOME;

    try {
      const updated = await api<IngredientRecord>(
        `/api/ingredients/${ingredientId}`,
        {
          method: "PATCH",
          body: toIngredientInput(values),
          schema: ingredientSchema,
        },
      );
      applySnapshot(withUpdated(snapshot.value, updated));
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        ...resolveIngredientMutationError(cause, {
          action: "update",
          limit: subscription.value?.ingredientsLimit ?? null,
        }),
      };
    } finally {
      finish();
    }
  }

  async function removeIngredient(
    ingredientId: number,
  ): Promise<MutationOutcome> {
    const finish = beginMutation("delete", OVERLAY_MESSAGES.delete);
    if (!finish) return BUSY_OUTCOME;

    try {
      await api(`/api/ingredients/${ingredientId}`, { method: "DELETE" });
      applySnapshot(withRemoved(snapshot.value, ingredientId));
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        ...resolveIngredientMutationError(cause, {
          action: "delete",
          limit: subscription.value?.ingredientsLimit ?? null,
          usedRecipes: await resolveUsedRecipes(ingredientId, cause),
        }),
      };
    } finally {
      finish();
    }
  }

  /**
   * El 409 de Hono trae `recipes` fuera del envelope y `parseApiError` lo
   * descarta: se resuelve con el mapa de uso local y, si viniera vacío, con
   * `GET /api/ingredients/:id/usage` (igual que hacía el baseline tras el conflicto).
   */
  async function resolveUsedRecipes(
    ingredientId: number,
    cause: unknown,
  ): Promise<string[]> {
    const local = usedRecipesFor(ingredientId);
    if (local.length > 0 || !isIngredientInUse(cause)) return local;

    try {
      const response = await api<IngredientUsageResponse>(
        `/api/ingredients/${ingredientId}/usage`,
        { schema: ingredientUsageResponseSchema },
      );
      return response.recipes.map((recipe) => recipe.name);
    } catch (fallbackCause) {
      console.error(
        "[ingredients] no se pudo resolver el uso del ingrediente",
        fallbackCause,
      );
      return [];
    }
  }

  return {
    ingredients,
    usage,
    counts,
    loading,
    loadFailed,
    refresh,
    searchQuery,
    filteredIngredients,
    usedRecipesFor,
    mutation,
    createIngredient,
    updateIngredient,
    removeIngredient,
  };
}
