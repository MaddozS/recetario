/**
 * Mensajes de error de las mutaciones de ingredientes.
 *
 * Módulo puro y sin aliases: cubierto en `test/unit`. `planLimit` sólo se activa
 * con el código `PLAN_LIMIT` del envelope de Hono, para que la UI muestre el CTA
 * de upgrade únicamente cuando la causa real es el plan.
 */
export type IngredientMutationAction = "create" | "update" | "delete";

export type IngredientMutationFailure = {
  message: string;
  recipes?: string[];
  planLimit?: boolean;
};

export type IngredientMutationErrorContext = {
  action: IngredientMutationAction;
  limit: number | null;
  usedRecipes?: string[];
};

type ErrorLike = {
  status?: number;
  code?: string;
  reason?: string;
  message?: string;
};

export const INGREDIENT_IN_USE_REASON = "ingredient_in_use";
export const INGREDIENT_IN_USE_MESSAGE =
  "No se puede eliminar porque el ingrediente está en uso.";
export const DELETED_INGREDIENT_MESSAGE = "El ingrediente ya no existe.";

const FALLBACK_MESSAGES: Record<IngredientMutationAction, string> = {
  create: "No se pudo crear el ingrediente.",
  update: "No se pudo actualizar el ingrediente.",
  delete: "No se pudo eliminar el ingrediente.",
};

function asErrorLike(error: unknown): ErrorLike | null {
  return typeof error === "object" && error !== null
    ? (error as ErrorLike)
    : null;
}

/** 409 `DOMAIN_ERROR` + `reason:"ingredient_in_use"` del borrado bloqueado. */
export function isIngredientInUse(error: unknown): boolean {
  const candidate = asErrorLike(error);
  return (
    candidate?.status === 409 && candidate.reason === INGREDIENT_IN_USE_REASON
  );
}

/**
 * Copy del límite de plan. Corrige las tildes que arrastraba el texto del baseline
 * ("limite"/"mas"); cuando recetas porte su mensaje debe usar este mismo texto.
 * El rango se omite si el plan es ilimitado (caso defensivo).
 */
export function ingredientLimitMessage(limit: number | null): string {
  if (limit === null) {
    return "Has alcanzado el límite de ingredientes de tu plan Free. Actualiza tu plan para crear más.";
  }

  return `Has alcanzado el límite de ${limit} ingredientes de tu plan Free. Actualiza tu plan para crear más.`;
}

export function resolveIngredientMutationError(
  error: unknown,
  context: IngredientMutationErrorContext,
): IngredientMutationFailure {
  const { action, limit, usedRecipes = [] } = context;

  if (isIngredientInUse(error)) {
    return {
      message: INGREDIENT_IN_USE_MESSAGE,
      recipes: usedRecipes.length > 0 ? [...usedRecipes] : undefined,
    };
  }

  const candidate = asErrorLike(error);
  if (candidate?.status === 404) {
    return { message: DELETED_INGREDIENT_MESSAGE };
  }

  if (candidate?.code === "PLAN_LIMIT") {
    return { message: ingredientLimitMessage(limit), planLimit: true };
  }

  if (
    typeof candidate?.status === "number" &&
    typeof candidate.message === "string" &&
    candidate.message.trim().length > 0
  ) {
    return { message: candidate.message };
  }

  return { message: FALLBACK_MESSAGES[action] };
}
