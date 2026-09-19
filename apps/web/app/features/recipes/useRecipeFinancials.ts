import { presentationSchema, recipeFixedCostSchema } from "@recetario/types";
import type { Ref } from "vue";
import type { RecipeDetailRecord } from "./recipe-detail-form";
import {
  toFixedCostPayload,
  validateFixedCostDraft,
  withFixedCostCreated,
  withFixedCostRemoved,
  withFixedCostUpdated,
} from "./recipe-fixed-costs";
import type { FixedCostDraft, FixedCostRecord } from "./recipe-fixed-costs";
import { resolveRecipeFinancialsError } from "./recipe-messages";
import type { RecipeFinancialsAction } from "./recipe-messages";
import {
  toPresentationCreatePayload,
  toPresentationUpdatePayload,
  validatePresentationDraft,
  withPresentationCreated,
  withPresentationRemoved,
  withPresentationUpdated,
} from "./recipe-presentations";
import type {
  PresentationDraft,
  PresentationRecord,
} from "./recipe-presentations";
import {
  computeRecipeBatchCost,
  computeSuggestedBatchPrice,
} from "./recipe-financials";
import type { MutationOutcome } from "./useRecipes";

/**
 * Costos fijos de la receta y presentaciones de venta (Task 10).
 *
 * Las mutaciones van directo a Hono y el resultado se aplica al detalle con
 * `applyRecipe` (escritor único, propiedad de `useRecipeDetail`): al cambiar
 * `recipeFixedCosts` o `presentations`, el resumen financiero, el costo de la
 * mezcla y los importes por pieza se recalculan solos. No hay recargas ni
 * parches de DOM, que es lo que hacía el baseline con sus custom elements.
 *
 * El CRUD es autónomo del modo de edición de la receta (`?edit=true`): el baseline
 * escondía «Nueva Presentación» detrás de ese modo.
 */
export type RecipeFinancialsMutation = RecipeFinancialsAction;

export const FIXED_COST_CREATED_FEEDBACK = "Costo fijo creado.";
export const FIXED_COST_SAVED_FEEDBACK = "Costo fijo guardado.";
export const FIXED_COST_DELETED_FEEDBACK = "Costo fijo eliminado.";
export const PRESENTATION_CREATED_FEEDBACK =
  "Presentación creada correctamente.";
export const PRESENTATION_SAVED_FEEDBACK =
  "Presentación guardada correctamente.";
export const PRESENTATION_DELETED_FEEDBACK =
  "Presentación eliminada correctamente.";

const BUSY_OUTCOME: MutationOutcome = {
  ok: false,
  message: "Ya hay una operación en curso. Espera a que termine.",
};

const OVERLAY_MESSAGES: Record<RecipeFinancialsMutation, string> = {
  "create-fixed-cost": "Guardando costo fijo…",
  "update-fixed-cost": "Guardando costo fijo…",
  "delete-fixed-cost": "Eliminando costo fijo…",
  "create-presentation": "Creando presentación…",
  "update-presentation": "Guardando presentación…",
  "delete-presentation": "Eliminando presentación…",
};

export type UseRecipeFinancialsOptions = {
  recipeId: Ref<string>;
  recipe: Ref<RecipeDetailRecord | null>;
  applyRecipe: (next: RecipeDetailRecord) => void;
  multiplier: Ref<number>;
  costoDirectoTotal: Ref<number>;
  desiredMarginValue: Ref<number>;
  fixedCostsPercentageValue: Ref<number>;
  hasAdvancedCosts: Ref<boolean>;
};

export function useRecipeFinancials(options: UseRecipeFinancialsOptions) {
  const api = useApi();
  const overlay = useState<string | null>("loading-overlay", () => null);

  const presentations = computed(
    () => options.recipe.value?.presentations ?? [],
  );
  const recipeFixedCosts = computed(
    () => options.recipe.value?.recipeFixedCosts ?? [],
  );

  /** Costo de una mezcla y precio sugerido: base de las presentaciones. */
  const recipeBatchCost = computed(() =>
    computeRecipeBatchCost({
      hasAdvancedCosts: options.hasAdvancedCosts.value,
      costoDirectoTotal: options.costoDirectoTotal.value,
      recipeFixedCosts: recipeFixedCosts.value,
      multiplier: options.multiplier.value,
      fixedCostsPercentageValue: options.fixedCostsPercentageValue.value,
    }),
  );
  const suggestedBatchPrice = computed(() =>
    computeSuggestedBatchPrice(
      recipeBatchCost.value,
      options.desiredMarginValue.value,
    ),
  );

  const mutation = ref<RecipeFinancialsMutation | null>(null);
  const feedback = ref<string | null>(null);

  function beginMutation(
    action: RecipeFinancialsMutation,
    overlayMessage: string | null = null,
  ): (() => void) | null {
    if (mutation.value !== null) return null;

    mutation.value = action;
    if (overlayMessage) overlay.value = overlayMessage;

    return () => {
      mutation.value = null;
      if (overlayMessage) overlay.value = null;
    };
  }

  function failure(
    error: unknown,
    action: RecipeFinancialsMutation,
  ): MutationOutcome {
    return { ok: false, ...resolveRecipeFinancialsError(error, { action }) };
  }

  async function createFixedCost(
    draft: FixedCostDraft,
  ): Promise<MutationOutcome> {
    const current = options.recipe.value;
    const validation = validateFixedCostDraft(draft);
    if (!validation.valid) {
      return { ok: false, message: validation.message };
    }
    if (!current) return failure(null, "create-fixed-cost");

    const finish = beginMutation("create-fixed-cost");
    if (!finish) return BUSY_OUTCOME;

    try {
      const created = await api<FixedCostRecord>(
        `/api/recipes/${current.id}/fixed-costs`,
        {
          method: "POST",
          body: toFixedCostPayload(draft),
          schema: recipeFixedCostSchema,
        },
      );

      options.applyRecipe({
        ...current,
        recipeFixedCosts: withFixedCostCreated(
          current.recipeFixedCosts,
          created,
        ),
      });
      feedback.value = FIXED_COST_CREATED_FEEDBACK;
      return { ok: true, id: created.id };
    } catch (cause) {
      return failure(cause, "create-fixed-cost");
    } finally {
      finish();
    }
  }

  async function updateFixedCost(
    fixedCostId: number,
    draft: FixedCostDraft,
  ): Promise<MutationOutcome> {
    const current = options.recipe.value;
    const validation = validateFixedCostDraft(draft);
    if (!validation.valid) {
      return { ok: false, message: validation.message };
    }
    if (!current) return failure(null, "update-fixed-cost");

    const finish = beginMutation("update-fixed-cost");
    if (!finish) return BUSY_OUTCOME;

    try {
      const updated = await api<FixedCostRecord>(
        `/api/recipes/${current.id}/fixed-costs/${fixedCostId}`,
        {
          method: "PATCH",
          body: toFixedCostPayload(draft),
          schema: recipeFixedCostSchema,
        },
      );

      options.applyRecipe({
        ...current,
        recipeFixedCosts: withFixedCostUpdated(
          current.recipeFixedCosts,
          updated,
        ),
      });
      feedback.value = FIXED_COST_SAVED_FEEDBACK;
      return { ok: true, id: updated.id };
    } catch (cause) {
      return failure(cause, "update-fixed-cost");
    } finally {
      finish();
    }
  }

  async function deleteFixedCost(
    fixedCostId: number,
  ): Promise<MutationOutcome> {
    const current = options.recipe.value;
    if (!current) return failure(null, "delete-fixed-cost");

    const finish = beginMutation(
      "delete-fixed-cost",
      OVERLAY_MESSAGES["delete-fixed-cost"],
    );
    if (!finish) return BUSY_OUTCOME;

    try {
      await api(`/api/recipes/${current.id}/fixed-costs/${fixedCostId}`, {
        method: "DELETE",
      });

      options.applyRecipe({
        ...current,
        recipeFixedCosts: withFixedCostRemoved(
          current.recipeFixedCosts,
          fixedCostId,
        ),
      });
      feedback.value = FIXED_COST_DELETED_FEEDBACK;
      return { ok: true, id: fixedCostId };
    } catch (cause) {
      return failure(cause, "delete-fixed-cost");
    } finally {
      finish();
    }
  }

  async function createPresentation(
    draft: PresentationDraft,
  ): Promise<MutationOutcome> {
    const current = options.recipe.value;
    const validation = validatePresentationDraft(draft);
    if (!validation.valid) {
      return { ok: false, message: validation.message };
    }
    if (!current) return failure(null, "create-presentation");

    const finish = beginMutation("create-presentation");
    if (!finish) return BUSY_OUTCOME;

    try {
      const created = await api<PresentationRecord>(
        `/api/recipes/${current.id}/presentations`,
        {
          method: "POST",
          body: toPresentationCreatePayload(draft),
          schema: presentationSchema,
        },
      );

      options.applyRecipe({
        ...current,
        presentations: withPresentationCreated(current.presentations, created),
      });
      feedback.value = PRESENTATION_CREATED_FEEDBACK;
      return { ok: true, id: created.id };
    } catch (cause) {
      return failure(cause, "create-presentation");
    } finally {
      finish();
    }
  }

  async function updatePresentation(
    presentationId: number,
    draft: PresentationDraft,
  ): Promise<MutationOutcome> {
    const current = options.recipe.value;
    const validation = validatePresentationDraft(draft);
    if (!validation.valid) {
      return { ok: false, message: validation.message };
    }
    if (!current) return failure(null, "update-presentation");

    const finish = beginMutation("update-presentation");
    if (!finish) return BUSY_OUTCOME;

    try {
      const updated = await api<PresentationRecord>(
        `/api/recipes/${current.id}/presentations/${presentationId}`,
        {
          method: "PATCH",
          body: toPresentationUpdatePayload(draft),
          schema: presentationSchema,
        },
      );

      options.applyRecipe({
        ...current,
        presentations: withPresentationUpdated(current.presentations, updated),
      });
      feedback.value = PRESENTATION_SAVED_FEEDBACK;
      return { ok: true, id: updated.id };
    } catch (cause) {
      return failure(cause, "update-presentation");
    } finally {
      finish();
    }
  }

  async function deletePresentation(
    presentationId: number,
  ): Promise<MutationOutcome> {
    const current = options.recipe.value;
    if (!current) return failure(null, "delete-presentation");

    const finish = beginMutation(
      "delete-presentation",
      OVERLAY_MESSAGES["delete-presentation"],
    );
    if (!finish) return BUSY_OUTCOME;

    try {
      await api(`/api/recipes/${current.id}/presentations/${presentationId}`, {
        method: "DELETE",
      });

      options.applyRecipe({
        ...current,
        presentations: withPresentationRemoved(
          current.presentations,
          presentationId,
        ),
      });
      feedback.value = PRESENTATION_DELETED_FEEDBACK;
      return { ok: true, id: presentationId };
    } catch (cause) {
      return failure(cause, "delete-presentation");
    } finally {
      finish();
    }
  }

  return {
    presentations,
    recipeFixedCosts,
    recipeBatchCost,
    suggestedBatchPrice,
    mutation,
    feedback,
    createFixedCost,
    updateFixedCost,
    deleteFixedCost,
    createPresentation,
    updatePresentation,
    deletePresentation,
  };
}
