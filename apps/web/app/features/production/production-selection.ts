import { PRODUCTION_BASIC_RECIPE_LIMIT } from '@recetario/stripe/plans-config';
import type { ProductionSelection } from './production-types';

/**
 * Selección del planificador: parseo/serialización de la query, tope de plan y
 * mutaciones puras sobre la lista de elecciones.
 *
 * La query es la fuente de verdad (`?recipes=&batches=&presentations=`), así
 * que el deep link, la recarga y el back/forward reconstruyen el plan sin
 * estado paralelo. Módulo puro: cubierto en `test/unit`.
 *
 * Contrato de la query:
 * - `recipes`: ids separados por coma; se deduplican y se recortan al tope.
 * - `batches`: un valor por slot (`finito > 0`; si no, 1).
 * - `presentations`: sólo si algún slot eligió presentación; cada slot es el id
 *   o `0` (= sin elección). Así los índices quedan alineados con `recipes`
 *   (el baseline los desplazaba al filtrar los indefinidos).
 */
export { PRODUCTION_BASIC_RECIPE_LIMIT };

export const DEFAULT_BATCHES = 1;
export const MIN_BATCHES = 0.5;
const BATCH_STEP = 0.5;

/** Valor de un parámetro de query: el primero si viniera repetido. */
function queryString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

export function normalizeBatches(value: unknown): number {
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BATCHES;
}

/** Un paso de 0.5 con mínimo `MIN_BATCHES` (paridad con el stepper del baseline). */
export function stepBatches(current: number, direction: 1 | -1): number {
  const next = normalizeBatches(current) + direction * BATCH_STEP;
  return Math.max(MIN_BATCHES, Math.round(next * 2) / 2);
}

function parsePresentationId(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseSelections(query: Record<string, unknown>): ProductionSelection[] {
  const ids = queryString(query.recipes)
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  const uniqueIds = [...new Set(ids)];
  const batches = queryString(query.batches).split(',').map(normalizeBatches);
  const presentations = queryString(query.presentations).split(',').map(parsePresentationId);

  return uniqueIds.map((recipeId, index) => {
    const presentationId = presentations[index];
    return {
      recipeId,
      batches: batches[index] ?? DEFAULT_BATCHES,
      ...(presentationId !== undefined ? { presentationId } : {}),
    };
  });
}

export function serializeSelections(
  selections: ReadonlyArray<ProductionSelection>
): Record<string, string> {
  if (selections.length === 0) return {};

  const query: Record<string, string> = {
    recipes: selections.map((selection) => selection.recipeId).join(','),
    batches: selections.map((selection) => selection.batches).join(','),
  };

  if (selections.some((selection) => selection.presentationId !== undefined)) {
    query.presentations = selections.map((selection) => selection.presentationId ?? 0).join(',');
  }

  return query;
}

/**
 * Descarta ids que ya no existen y ordena por catálogo (el baseline leía los
 * checkboxes en orden DOM, que es el orden del catálogo).
 */
export function filterToCatalog(
  selections: ReadonlyArray<ProductionSelection>,
  catalogIds: ReadonlyArray<number>
): ProductionSelection[] {
  const position = new Map(catalogIds.map((id, index) => [id, index]));
  return selections
    .filter((selection) => position.has(selection.recipeId))
    .sort((a, b) => (position.get(a.recipeId) ?? 0) - (position.get(b.recipeId) ?? 0));
}

export function atLimit(selections: ReadonlyArray<ProductionSelection>, max: number): boolean {
  return selections.length >= max;
}

/**
 * Selección efectiva: parsea la query, descarta ids que ya no están en el
 * catálogo, ordena por catálogo y recorta al tope del plan. Es la única
 * definición que comparten el SSR, el render y las escrituras de la query.
 */
export function resolveSelections(
  query: Record<string, unknown>,
  catalogIds: ReadonlyArray<number>,
  max: number
): ProductionSelection[] {
  return filterToCatalog(parseSelections(query), catalogIds).slice(0, max);
}

export function toggleRecipe(
  selections: ReadonlyArray<ProductionSelection>,
  recipeId: number
): ProductionSelection[] {
  if (selections.some((selection) => selection.recipeId === recipeId)) {
    return selections.filter((selection) => selection.recipeId !== recipeId);
  }
  return [...selections, { recipeId, batches: DEFAULT_BATCHES }];
}

export function setBatches(
  selections: ReadonlyArray<ProductionSelection>,
  recipeId: number,
  batches: unknown
): ProductionSelection[] {
  return selections.map((selection) =>
    selection.recipeId === recipeId
      ? { ...selection, batches: normalizeBatches(batches) }
      : selection
  );
}

export function setPresentation(
  selections: ReadonlyArray<ProductionSelection>,
  recipeId: number,
  presentationId: number | undefined
): ProductionSelection[] {
  return selections.map((selection) => {
    if (selection.recipeId !== recipeId) return selection;

    const next: ProductionSelection = {
      recipeId: selection.recipeId,
      batches: selection.batches,
    };
    if (presentationId !== undefined) next.presentationId = presentationId;
    return next;
  });
}

/**
 * «Seleccionar todas»: conserva mezclas y presentaciones de lo ya elegido y
 * respeta el tope de plan; desmarcar limpia la selección.
 */
export function selectAll(
  current: ReadonlyArray<ProductionSelection>,
  catalogIds: ReadonlyArray<number>,
  checked: boolean,
  max: number
): ProductionSelection[] {
  if (!checked) return [];

  const existing = new Map(current.map((selection) => [selection.recipeId, selection]));
  return catalogIds
    .slice(0, max)
    .map((recipeId) => existing.get(recipeId) ?? { recipeId, batches: DEFAULT_BATCHES });
}
