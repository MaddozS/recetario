import { isPro as isProPlan } from '@recetario/stripe/subscription';
import { recipeSummarySchema, recipeWithIngredientsSchema } from '@recetario/types';
import { z } from 'zod';
import { ApiError } from '~/utils/api-error';
import { filterRecipeGroups, groupRecipes } from './production-catalog';
import { calculateProduction } from './production-calculator';
import { selectionCountLabel } from './production-format';
import {
  PRODUCTION_BASIC_RECIPE_LIMIT,
  atLimit as selectionAtLimit,
  resolveSelections,
  selectAll as selectAllSelections,
  serializeSelections,
  setBatches as setSelectionBatches,
  setPresentation as setSelectionPresentation,
  stepBatches as stepSelectionBatches,
  toggleRecipe,
} from './production-selection';
import type {
  ProductionCatalogRecipe,
  ProductionRecipeRecord,
  ProductionSelection,
} from './production-types';

/**
 * Datos, selección y resultados del planificador de producción.
 *
 * El SSR trae el catálogo y el detalle **sólo** de las recetas de la query; al
 * seleccionar una receta nueva su detalle se pide por lotes (máximo 100 ids por
 * llamada) y se cachea en memoria. La selección vive en la URL (`?recipes=`,
 * `?batches=`, `?presentations=`) y se escribe con `replace`: el deep link, la
 * recarga y el back/forward reconstruyen el plan sin estado paralelo ni
 * recargas. Los resultados son un `computed` sobre `production-calculator`, así
 * que no hay debounce ni recálculo imperativo.
 *
 * El gate del plan se anticipa con `hasFeature`/`isPro`; Hono sigue siendo la
 * autoridad (`FEATURE_REQUIRED` se refleja como `gated`, el resto como fallo).
 */
export const PRODUCTION_KEY = 'production';
const DETAILS_CHUNK = 100;

type ProductionPageData = {
  catalog: ProductionCatalogRecipe[];
  details: ProductionRecipeRecord[];
  gated: boolean;
  failed: boolean;
};

function emptyData(): ProductionPageData {
  return { catalog: [], details: [], gated: false, failed: false };
}

function isGated(cause: unknown): boolean {
  return cause instanceof ApiError && cause.code === 'FEATURE_REQUIRED';
}

export function useProductionPlanner() {
  const api = useApi();
  const route = useRoute();
  const { subscription, hasFeature } = useAuth();

  const canAccess = computed(() => hasFeature('production_planner'));
  const isPro = computed(() => (subscription.value ? isProPlan(subscription.value) : false));
  const maxRecipes = computed(() =>
    isPro.value ? Number.POSITIVE_INFINITY : PRODUCTION_BASIC_RECIPE_LIMIT
  );

  async function fetchDetails(ids: ReadonlyArray<number>): Promise<ProductionRecipeRecord[]> {
    const unique = [...new Set(ids)];
    const records: ProductionRecipeRecord[] = [];

    for (let index = 0; index < unique.length; index += DETAILS_CHUNK) {
      const chunk = unique.slice(index, index + DETAILS_CHUNK);
      const response = await api<ProductionRecipeRecord[]>(
        `/api/recipes/by-ids?ids=${chunk.join(',')}`,
        { schema: z.array(recipeWithIngredientsSchema) }
      );
      records.push(...response);
    }

    return records;
  }

  const {
    data,
    pending: loading,
    refresh,
  } = useAsyncData<ProductionPageData>(
    PRODUCTION_KEY,
    async () => {
      if (!canAccess.value) return { ...emptyData(), gated: true };

      try {
        const catalog = await api<ProductionCatalogRecipe[]>('/api/recipes', {
          schema: z.array(recipeSummarySchema),
        });
        const wanted = resolveSelections(
          route.query,
          catalog.map((recipe) => recipe.id),
          maxRecipes.value
        );
        const details =
          wanted.length > 0
            ? await fetchDetails(wanted.map((selection) => selection.recipeId))
            : [];

        return { catalog, details, gated: false, failed: false };
      } catch (cause) {
        if (isGated(cause)) return { ...emptyData(), gated: true };

        console.error('[production] no se pudo cargar el planificador', cause);
        return { ...emptyData(), failed: true };
      }
    },
    // En navegación cliente la página pinta su skeleton en vez de bloquear; el
    // SSR espera la promesa, así que el HTML no cambia.
    { default: () => emptyData(), lazy: true }
  );

  const catalog = computed(() => data.value.catalog);
  const catalogIds = computed(() => catalog.value.map((recipe) => recipe.id));
  const detailById = computed(
    () => new Map(data.value.details.map((recipe) => [recipe.id, recipe]))
  );

  const selections = computed(() =>
    resolveSelections(route.query, catalogIds.value, maxRecipes.value)
  );
  const selectedIds = computed(
    () => new Set(selections.value.map((selection) => selection.recipeId))
  );
  const selectionById = computed(
    () => new Map(selections.value.map((selection) => [selection.recipeId, selection]))
  );
  const selectionLabel = computed(() =>
    selectionCountLabel(
      selections.value.length,
      selections.value.reduce((total, selection) => total + (selection.batches || 1), 0)
    )
  );
  const atLimit = computed(() => selectionAtLimit(selections.value, maxRecipes.value));

  const presentationOptions = computed(
    () =>
      new Map(
        data.value.details.map((recipe) => [
          recipe.id,
          recipe.presentations.map((presentation) => ({
            id: presentation.id,
            name: presentation.name,
          })),
        ])
      )
  );

  // ── Detalle bajo demanda ─────────────────────────────────────────────────
  // `attemptedIds` distingue «todavía no se pidió» de «se pidió y no vino»
  // (receta borrada en carrera): sin él, un id fantasma dejaría los resultados
  // en espera para siempre.
  const attemptedIds = ref<Set<number>>(new Set());
  const detailsError = ref(false);

  const missingIds = computed(() =>
    selections.value
      .map((selection) => selection.recipeId)
      .filter((id) => !detailById.value.has(id) && !attemptedIds.value.has(id))
  );
  const resultsPending = computed(() => missingIds.value.length > 0);

  function applyDetails(records: ReadonlyArray<ProductionRecipeRecord>): void {
    if (records.length === 0) return;

    const byId = new Map(data.value.details.map((recipe) => [recipe.id, recipe]));
    for (const record of records) byId.set(record.id, record);
    data.value = { ...data.value, details: [...byId.values()] };
  }

  async function loadMissingDetails(): Promise<void> {
    const missing = missingIds.value;
    if (missing.length === 0) return;

    try {
      const records = await fetchDetails(missing);
      attemptedIds.value = new Set([...attemptedIds.value, ...missing]);
      applyDetails(records);
      detailsError.value = false;
    } catch (cause) {
      console.error('[production] no se pudieron cargar las recetas seleccionadas', cause);
      detailsError.value = true;
    }
  }

  async function retryDetails(): Promise<void> {
    detailsError.value = false;
    await loadMissingDetails();
  }

  watch(
    missingIds,
    () => {
      if (import.meta.client) void loadMissingDetails();
    },
    { immediate: true }
  );

  // ── Selección ────────────────────────────────────────────────────────────
  async function writeSelections(next: ProductionSelection[]): Promise<void> {
    await navigateTo({ path: '/produccion', query: serializeSelections(next) }, { replace: true });
  }

  async function toggle(recipeId: number): Promise<void> {
    if (!selectedIds.value.has(recipeId) && atLimit.value) return;
    await writeSelections(toggleRecipe(selections.value, recipeId));
  }

  async function toggleAll(checked: boolean): Promise<void> {
    await writeSelections(
      selectAllSelections(selections.value, catalogIds.value, checked, maxRecipes.value)
    );
  }

  async function updateBatches(recipeId: number, batches: unknown): Promise<void> {
    await writeSelections(setSelectionBatches(selections.value, recipeId, batches));
  }

  async function stepBatchesFor(recipeId: number, direction: 1 | -1): Promise<void> {
    const current = selections.value.find((selection) => selection.recipeId === recipeId);
    if (!current) return;

    await writeSelections(
      setSelectionBatches(
        selections.value,
        recipeId,
        stepSelectionBatches(current.batches, direction)
      )
    );
  }

  async function updatePresentation(
    recipeId: number,
    presentationId: number | undefined
  ): Promise<void> {
    await writeSelections(setSelectionPresentation(selections.value, recipeId, presentationId));
  }

  // ── Búsqueda y agrupado ──────────────────────────────────────────────────
  const searchQuery = ref('');
  const filtered = computed(() => {
    const { groups } = groupRecipes(catalog.value);
    return filterRecipeGroups(groups, searchQuery.value, selectedIds.value);
  });

  // ── Resultados y stage ───────────────────────────────────────────────────
  const results = computed(() => calculateProduction(selections.value, data.value.details));

  // El escenario se fija con el primer catálogo disponible y a partir de ahí sólo
  // lo cambian las acciones del usuario: con datos `lazy` el catálogo llega
  // después del setup, así que el valor inicial no puede capturarse antes (un
  // deep link `?recipes=…` debe abrir en resultados). `flush: "sync"` decide en
  // el mismo tick en que llega el dato: en SSR eso ocurre durante el render y un
  // watcher diferido pintaría el selector en el HTML y los resultados en cliente.
  const stage = ref<'select' | 'results'>('select');
  let stageCaptured = false;

  watch(
    () => data.value.catalog.length > 0,
    (ready) => {
      if (!ready || stageCaptured) return;
      stageCaptured = true;
      stage.value = selections.value.length > 0 ? 'results' : 'select';
    },
    { immediate: true, flush: 'sync' }
  );

  function showResults(): void {
    if (selections.value.length > 0) stage.value = 'results';
  }

  function editSelection(): void {
    stage.value = 'select';
  }

  return {
    canAccess,
    gated: computed(() => data.value.gated),
    loadFailed: computed(() => data.value.failed),
    loading,
    refresh,
    catalog,
    catalogIds,
    selections,
    selectedIds,
    selectionById,
    selectionLabel,
    atLimit,
    isPro,
    maxRecipes,
    presentationOptions,
    results,
    resultsPending,
    detailsError,
    retryDetails,
    groups: computed(() => filtered.value.groups),
    visibleCount: computed(() => filtered.value.visibleCount),
    searchQuery,
    stage,
    showResults,
    editSelection,
    toggle,
    toggleAll,
    updateBatches,
    stepBatchesFor,
    updatePresentation,
  };
}
