import { recipeWithIngredientsSchema } from '@recetario/types';
import {
  buildFinancialEditFields,
  addIngredientRow,
  formFromDetail,
  invalidRows,
  parseDecimal,
  removeIngredientRow,
  toRecipeUpdatePayload,
  updateIngredientRow,
  validateRecipeForm,
  buildUnitOptions,
  INVALID_ROWS_MESSAGE,
} from './recipe-detail-form';
import type { IngredientRow, RecipeDetailForm, RecipeDetailRecord } from './recipe-detail-form';
import {
  clampPercentage,
  formatLastUpdated,
  multiplierStepFor,
  normalizeMultiplier,
  parseMultiplierParam,
  showAdjustedQuantity,
} from './recipe-detail-format';
import { buildFinancialRows, calcularCostoDirecto } from './recipe-financials';
import { resolveRecipeMutationError } from './recipe-messages';
import type { MutationOutcome } from './useRecipes';
import { fetchRecipeDetailPage, recipeDetailKey } from './recipe-detail-data';
import type { RecipeDetailPageData } from './recipe-detail-data';

/**
 * Datos, edición y mutaciones del detalle de receta.
 *
 * El detalle y el catálogo de ingredientes llegan del SSR en una sola llamada;
 * el modo de edición y el multiplicador viven en la query (`?edit=true`,
 * `?multiplier=`), así que el deep link y el back/forward los resuelve el router
 * sin refetch ni recarga. Guardar usa la respuesta del `PATCH` (shapeada, igual
 * que el GET) como estado nuevo; el listado se refresca solo al remontar.
 */
export const RECIPE_TABS = [
  { id: 'ingredientes', label: 'Ingredientes' },
  { id: 'costos-fijos', label: 'Costos Fijos' },
  { id: 'presentaciones', label: 'Presentaciones' },
] as const;

export const COMMENTS_STORAGE_KEY = 'recetario.showComments';
export const SAVED_FEEDBACK = 'Receta guardada correctamente.';

const BUSY_OUTCOME: MutationOutcome = {
  ok: false,
  message: 'Ya hay una operación en curso. Espera a que termine.',
};

export function useRecipeDetail() {
  const api = useApi();
  const route = useRoute();
  const { subscription, hasFeature } = useAuth();
  const overlay = useState<string | null>('loading-overlay', () => null);

  const recipeId = computed(() => String(route.params.recipe ?? ''));

  // ── Notas de ingredientes ───────────────────────────────────────────────
  const showComments = ref(false);

  function setCommentsVisible(visible: boolean): void {
    showComments.value = visible;
    try {
      localStorage.setItem(COMMENTS_STORAGE_KEY, visible ? '1' : '0');
    } catch {
      /* localStorage puede no estar disponible */
    }
  }

  onMounted(() => {
    try {
      showComments.value = localStorage.getItem(COMMENTS_STORAGE_KEY) === '1';
    } catch {
      showComments.value = false;
    }
  });

  // `lazy`: en navegación cliente la página pinta su skeleton y el detalle llega
  // después; en SSR el render espera la promesa (y el middleware de migas
  // comparte la clave, así que sigue siendo una sola petición). El valor inicial
  // es `idle`, no `failed`, para poder distinguir «cargando» de «falló».
  const { data, refresh } = useAsyncData<RecipeDetailPageData>(
    recipeDetailKey(recipeId.value),
    () => fetchRecipeDetailPage(api, recipeId.value),
    { default: () => ({ status: 'idle' as const }), lazy: true }
  );

  const recipe = computed(() => (data.value.status === 'ready' ? data.value.recipe : null));
  const ingredientCatalog = computed(() =>
    data.value.status === 'ready' ? data.value.ingredients : []
  );
  const loading = computed(() => data.value.status === 'idle');
  const loadFailed = computed(() => data.value.status === 'failed');
  const notFound = computed(() => data.value.status === 'notFound');

  /**
   * Único escritor del detalle: lo usan el guardado de la receta y las
   * mutaciones de sus subsecciones (Task 10), que así no duplican el armado del
   * estado ni pierden el catálogo de ingredientes.
   */
  function applyRecipe(next: RecipeDetailRecord): void {
    data.value = {
      status: 'ready',
      recipe: next,
      ingredients: ingredientCatalog.value,
    };
  }

  /** Contador local de claves de fila (`v-for` estable). */
  let rowSequence = 0;
  const nextRowKey = () => `row-${++rowSequence}`;

  const form = reactive<RecipeDetailForm>({
    name: '',
    category: '',
    desiredMargin: '0',
    fixedCostsPercentage: '0',
    rows: [],
  });

  function resetForm(): void {
    const current = recipe.value;
    if (!current) return;
    Object.assign(form, formFromDetail(current, nextRowKey));
  }

  // Siembra sincrónica con el detalle disponible: en SSR/hidratación el payload
  // ya lo trae, así que el formulario arranca igual en servidor y cliente y
  // `?edit=true` se hidrata sin diferencias. `flush: "sync"` es necesario porque
  // con `lazy` el dato llega después del setup y un watch diferido sembraría el
  // formulario un tick tarde (el servidor renderizaba vacío). Se resiembra al
  // entrar o cancelar la edición y tras guardar.
  watch(
    () => recipe.value?.id ?? null,
    (id) => {
      if (id !== null) resetForm();
    },
    { immediate: true, flush: 'sync' }
  );

  // ── Modo de edición (?edit=true) ─────────────────────────────────────────
  const isEditMode = computed(() => route.query.edit === 'true');

  async function enterEdit(): Promise<void> {
    if (isEditMode.value) return;
    resetForm();
    await navigateTo({ query: { ...route.query, edit: 'true' } });
  }

  async function exitEdit(options: { replace?: boolean } = {}): Promise<void> {
    await navigateTo(
      { query: { ...route.query, edit: undefined } },
      options.replace ? { replace: true } : undefined
    );
  }

  async function cancelEdit(): Promise<void> {
    resetForm();
    await exitEdit({ replace: true });
  }

  // ── Multiplicador (?multiplier=) ────────────────────────────────────────
  const multiplier = computed(() => parseMultiplierParam(route.query.multiplier));
  const adjusted = computed(() => showAdjustedQuantity(multiplier.value));
  const multiplierStep = computed(() => multiplierStepFor(multiplier.value));

  async function setMultiplier(next: number): Promise<void> {
    const value = normalizeMultiplier(Math.max(next, 0.01));
    if (value === multiplier.value) return;
    await navigateTo({
      query: { ...route.query, multiplier: String(value) },
    });
  }

  async function stepMultiplier(direction: 1 | -1): Promise<void> {
    await setMultiplier(multiplier.value + direction * multiplierStep.value);
  }

  // ── Tabs (#hash) ────────────────────────────────────────────────────────
  const activeTab = computed(() => {
    const hash = route.hash.replace('#', '');
    return RECIPE_TABS.some((tab) => tab.id === hash) ? hash : 'ingredientes';
  });

  async function selectTab(id: string): Promise<void> {
    if (id === activeTab.value) return;
    await navigateTo({ hash: `#${id}` }, { replace: true });
  }

  // ── Derivados de la vista ───────────────────────────────────────────────
  const unitOptions = computed(() =>
    buildUnitOptions(ingredientCatalog.value, recipe.value?.ingredients ?? [])
  );

  const hasAdvancedCosts = computed(() => hasFeature('advanced_costs'));
  const financialEditFields = computed(() => buildFinancialEditFields(hasAdvancedCosts.value));

  const desiredMarginValue = computed(() =>
    clampPercentage(
      isEditMode.value ? parseDecimal(form.desiredMargin) : (recipe.value?.desiredMargin ?? 0),
      99.99
    )
  );
  const fixedCostsPercentageValue = computed(() =>
    clampPercentage(
      isEditMode.value
        ? parseDecimal(form.fixedCostsPercentage)
        : (recipe.value?.fixedCostsPercentage ?? 0)
    )
  );

  const costoDirectoTotal = computed(() =>
    calcularCostoDirecto(recipe.value?.ingredients ?? [], multiplier.value)
  );

  const financialRows = computed(() =>
    buildFinancialRows({
      hasAdvancedCosts: hasAdvancedCosts.value,
      costoDirectoTotal: costoDirectoTotal.value,
      recipeFixedCosts: recipe.value?.recipeFixedCosts ?? [],
      multiplier: multiplier.value,
      fixedCostsPercentageValue: fixedCostsPercentageValue.value,
      desiredMarginValue: desiredMarginValue.value,
    })
  );

  const updatedText = computed(() => formatLastUpdated(recipe.value?.updatedAt));

  // ── Filas del editor ────────────────────────────────────────────────────
  /** Filas señaladas tras un intento de guardado inválido. */
  const invalidRowKeys = ref<string[]>([]);

  function addRow(): void {
    form.rows = addIngredientRow(form.rows, nextRowKey());
    invalidRowKeys.value = [];
  }

  function removeRow(index: number): void {
    form.rows = removeIngredientRow(form.rows, index);
    invalidRowKeys.value = [];
  }

  function patchRow(index: number, patch: Partial<Omit<IngredientRow, 'key'>>): void {
    form.rows = updateIngredientRow(form.rows, index, patch);
    invalidRowKeys.value = [];
  }

  // ── Mutaciones ──────────────────────────────────────────────────────────
  const saving = ref(false);
  const busy = ref<'delete' | 'duplicate' | null>(null);
  const formError = ref<string | null>(null);
  const feedback = ref<string | null>(null);

  const planLimit = computed(() => subscription.value?.recipesLimit ?? null);

  async function save(): Promise<void> {
    const current = recipe.value;
    if (!current || saving.value) return;

    const validation = validateRecipeForm(form);
    if (!validation.valid) {
      formError.value = validation.message;
      invalidRowKeys.value =
        validation.message === INVALID_ROWS_MESSAGE
          ? invalidRows(form.rows).map((row) => row.key)
          : [];
      return;
    }

    saving.value = true;
    formError.value = null;
    invalidRowKeys.value = [];
    overlay.value = 'Guardando receta…';

    try {
      const updated = await api<RecipeDetailRecord>(`/api/recipes/${current.id}`, {
        method: 'PATCH',
        body: toRecipeUpdatePayload(form, current),
        schema: recipeWithIngredientsSchema,
      });

      applyRecipe(updated);

      // El formulario queda igual al estado del servidor.
      resetForm();
      await exitEdit({ replace: true });
      feedback.value = SAVED_FEEDBACK;
    } catch (cause) {
      formError.value = resolveRecipeMutationError(cause, {
        action: 'update',
        limit: planLimit.value,
      }).message;
    } finally {
      saving.value = false;
      overlay.value = null;
    }
  }

  async function removeRecipe(recipeIdToRemove: number): Promise<MutationOutcome> {
    if (busy.value !== null) return BUSY_OUTCOME;

    busy.value = 'delete';
    overlay.value = 'Eliminando receta…';

    try {
      await api(`/api/recipes/${recipeIdToRemove}`, { method: 'DELETE' });
      await navigateTo('/recipes');
      return { ok: true, id: recipeIdToRemove };
    } catch (cause) {
      return {
        ok: false,
        ...resolveRecipeMutationError(cause, {
          action: 'delete',
          limit: planLimit.value,
        }),
      };
    } finally {
      busy.value = null;
      overlay.value = null;
    }
  }

  async function duplicateRecipe(recipeIdToDuplicate: number): Promise<MutationOutcome> {
    if (busy.value !== null) return BUSY_OUTCOME;

    busy.value = 'duplicate';
    overlay.value = 'Duplicando receta…';

    try {
      const duplicated = await api<RecipeDetailRecord>(
        `/api/recipes/${recipeIdToDuplicate}/duplicate`,
        { method: 'POST', schema: recipeWithIngredientsSchema }
      );

      await navigateTo(`/recipes/${duplicated.id}?edit=true`);
      return { ok: true, id: duplicated.id };
    } catch (cause) {
      return {
        ok: false,
        ...resolveRecipeMutationError(cause, {
          action: 'duplicate',
          limit: planLimit.value,
        }),
      };
    } finally {
      busy.value = null;
      overlay.value = null;
    }
  }

  return {
    data,
    recipe,
    recipeId,
    loading,
    loadFailed,
    notFound,
    refresh,
    applyRecipe,
    ingredientCatalog,
    multiplier,
    costoDirectoTotal,
    desiredMarginValue,
    fixedCostsPercentageValue,
    adjusted,
    setMultiplier,
    stepMultiplier,
    isEditMode,
    enterEdit,
    cancelEdit,
    form,
    formError,
    feedback,
    saving,
    busy,
    save,
    removeRecipe,
    duplicateRecipe,
    unitOptions,
    showComments,
    setCommentsVisible,
    activeTab,
    selectTab,
    financialRows,
    financialEditFields,
    hasAdvancedCosts,
    updatedText,
    invalidRowKeys,
    addRow,
    removeRow,
    patchRow,
  };
}
