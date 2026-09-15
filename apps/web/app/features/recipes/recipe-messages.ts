/**
 * Mensajes de error de las mutaciones de recetas.
 *
 * Módulo puro y sin aliases: cubierto en `test/unit`. `planLimit` sólo se activa
 * con el código `PLAN_LIMIT` del envelope de Hono, para que la UI muestre el CTA
 * de upgrade únicamente cuando la causa real es el plan; `FEATURE_REQUIRED`
 * (duplicar en plan Free) nunca lo ofrece, igual que en Astro.
 */
export type RecipeMutationAction = "create" | "duplicate" | "delete";

export type RecipeMutationFailure = {
  message: string;
  planLimit?: boolean;
};

export type RecipeMutationErrorContext = {
  action: RecipeMutationAction;
  limit: number | null;
};

type ErrorLike = {
  status?: number;
  code?: string;
  message?: string;
};

export const DUPLICATE_FEATURE_MESSAGE =
  "Funcionalidad no disponible en tu plan.";
export const RECIPE_NOT_FOUND_MESSAGE = "No se encontró la receta original.";
export const DELETED_RECIPE_MESSAGE = "La receta ya no existe.";

const FALLBACK_MESSAGES: Record<RecipeMutationAction, string> = {
  create: "No se pudo crear la receta.",
  duplicate: "Error al duplicar la receta.",
  delete: "No se pudo eliminar la receta.",
};

function asErrorLike(error: unknown): ErrorLike | null {
  return typeof error === "object" && error !== null
    ? (error as ErrorLike)
    : null;
}

/**
 * Copy del límite de plan con las tildes corregidas (Astro escribía
 * "limite"/"mas"); recetas porta el mismo texto que dejó la Task 7 en
 * ingredientes. El rango se omite si el plan es ilimitado (caso defensivo).
 */
export function recipeLimitMessage(limit: number | null): string {
  if (limit === null) {
    return "Has alcanzado el límite de recetas de tu plan Free. Actualiza tu plan para crear más.";
  }

  return `Has alcanzado el límite de ${limit} recetas de tu plan Free. Actualiza tu plan para crear más.`;
}

export function resolveRecipeMutationError(
  error: unknown,
  context: RecipeMutationErrorContext,
): RecipeMutationFailure {
  const { action, limit } = context;
  const candidate = asErrorLike(error);

  if (candidate?.code === "PLAN_LIMIT") {
    return { message: recipeLimitMessage(limit), planLimit: true };
  }

  if (candidate?.code === "FEATURE_REQUIRED") {
    return { message: DUPLICATE_FEATURE_MESSAGE };
  }

  if (candidate?.status === 404) {
    return {
      message:
        action === "duplicate"
          ? RECIPE_NOT_FOUND_MESSAGE
          : action === "delete"
            ? DELETED_RECIPE_MESSAGE
            : FALLBACK_MESSAGES[action],
    };
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
