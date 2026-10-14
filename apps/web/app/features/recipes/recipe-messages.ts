/**
 * Mensajes de error de las mutaciones de recetas.
 *
 * Módulo puro y sin aliases: cubierto en `test/unit`. `planLimit` sólo se activa
 * con el código `PLAN_LIMIT` del envelope de Hono, para que la UI muestre el CTA
 * de upgrade únicamente cuando la causa real es el plan; `FEATURE_REQUIRED`
 * (duplicar en plan Free) nunca lo ofrece, igual que en el baseline.
 */
export type RecipeMutationAction = 'create' | 'duplicate' | 'delete' | 'update';

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

export const DUPLICATE_FEATURE_MESSAGE = 'Funcionalidad no disponible en tu plan.';
export const RECIPE_NOT_FOUND_MESSAGE = 'No se encontró la receta original.';
export const DELETED_RECIPE_MESSAGE = 'La receta ya no existe.';

const FALLBACK_MESSAGES: Record<RecipeMutationAction, string> = {
  create: 'No se pudo crear la receta.',
  duplicate: 'Error al duplicar la receta.',
  delete: 'No se pudo eliminar la receta.',
  update: 'No se pudo actualizar la receta.',
};

function asErrorLike(error: unknown): ErrorLike | null {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : null;
}

/**
 * Copy del límite de plan con las tildes corregidas (el baseline escribía
 * "limite"/"mas"); recetas porta el mismo texto que dejó la Task 7 en
 * ingredientes. El rango se omite si el plan es ilimitado (caso defensivo).
 */
export function recipeLimitMessage(limit: number | null): string {
  if (limit === null) {
    return 'Has alcanzado el límite de recetas de tu plan Free. Actualiza tu plan para crear más.';
  }

  return `Has alcanzado el límite de ${limit} recetas de tu plan Free. Actualiza tu plan para crear más.`;
}

export function resolveRecipeMutationError(
  error: unknown,
  context: RecipeMutationErrorContext
): RecipeMutationFailure {
  const { action, limit } = context;
  const candidate = asErrorLike(error);

  if (candidate?.code === 'PLAN_LIMIT') {
    return { message: recipeLimitMessage(limit), planLimit: true };
  }

  if (candidate?.code === 'FEATURE_REQUIRED') {
    return { message: DUPLICATE_FEATURE_MESSAGE };
  }

  if (candidate?.status === 404) {
    if (action === 'duplicate') {
      return { message: RECIPE_NOT_FOUND_MESSAGE };
    }

    if (action === 'delete' || action === 'update') {
      return { message: DELETED_RECIPE_MESSAGE };
    }

    return { message: FALLBACK_MESSAGES[action] };
  }

  if (
    typeof candidate?.status === 'number' &&
    typeof candidate.message === 'string' &&
    candidate.message.trim().length > 0
  ) {
    return { message: candidate.message };
  }

  return { message: FALLBACK_MESSAGES[action] };
}

/** Mutaciones de las subsecciones del detalle (costos fijos y presentaciones). */
export type RecipeFinancialsAction =
  | 'create-fixed-cost'
  | 'update-fixed-cost'
  | 'delete-fixed-cost'
  | 'create-presentation'
  | 'update-presentation'
  | 'delete-presentation';

export type RecipeFinancialsErrorContext = {
  action: RecipeFinancialsAction;
};

export const FIXED_COST_NOT_FOUND_MESSAGE = 'No se encontró el costo fijo.';
export const PRESENTATION_NOT_FOUND_MESSAGE = 'No se encontró la presentación.';

const FINANCIALS_FALLBACK_MESSAGES: Record<RecipeFinancialsAction, string> = {
  'create-fixed-cost': 'No se pudo crear el costo fijo.',
  'update-fixed-cost': 'No se pudo guardar el costo fijo.',
  'delete-fixed-cost': 'No se pudo eliminar el costo fijo.',
  'create-presentation': 'No se pudo crear la presentación.',
  'update-presentation': 'No se pudo actualizar la presentación.',
  'delete-presentation': 'No se pudo eliminar la presentación.',
};

/**
 * Errores de costos fijos y presentaciones. Nunca ofrece upgrade: ninguna de
 * las dos está gateada por plan en Hono, así que un CTA ahí sería engañoso.
 */
export function resolveRecipeFinancialsError(
  error: unknown,
  context: RecipeFinancialsErrorContext
): RecipeMutationFailure {
  const candidate = asErrorLike(error);

  if (candidate?.status === 404) {
    return {
      message: context.action.endsWith('fixed-cost')
        ? FIXED_COST_NOT_FOUND_MESSAGE
        : PRESENTATION_NOT_FOUND_MESSAGE,
    };
  }

  if (
    typeof candidate?.status === 'number' &&
    typeof candidate.message === 'string' &&
    candidate.message.trim().length > 0
  ) {
    return { message: candidate.message };
  }

  return { message: FINANCIALS_FALLBACK_MESSAGES[context.action] };
}
