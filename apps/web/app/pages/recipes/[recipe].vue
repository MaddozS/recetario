<script setup lang="ts">
import type { MutationOutcome } from "~/features/recipes/useRecipes";
import { useRecipeFinancials } from "~/features/recipes/useRecipeFinancials";
import { toRecipeSummary } from "~/features/recipes/recipe-state";
import {
  RECIPE_TABS,
  useRecipeDetail,
} from "~/features/recipes/useRecipeDetail";
import FinancialSummary from "~/features/recipes/FinancialSummary.vue";
import PresentationsPanel from "~/features/recipes/PresentationsPanel.vue";
import RecipeDeleteDialog from "~/features/recipes/RecipeDeleteDialog.vue";
import RecipeDetailHeader from "~/features/recipes/RecipeDetailHeader.vue";
import RecipeDetailSkeleton from "~/features/recipes/RecipeDetailSkeleton.vue";
import RecipeDuplicateDialog from "~/features/recipes/RecipeDuplicateDialog.vue";
import RecipeErrorAlert from "~/features/recipes/RecipeErrorAlert.vue";
import RecipeFixedCostsPanel from "~/features/recipes/RecipeFixedCostsPanel.vue";
import RecipeIngredientsPanel from "~/features/recipes/RecipeIngredientsPanel.vue";
import RecipeTabs from "~/features/recipes/RecipeTabs.vue";

/**
 * Detalle y edición base de receta: página coordinadora delgada. Los datos, el
 * estado de edición (`?edit=true`), el multiplicador (`?multiplier=`) y las
 * mutaciones viven en `useRecipeDetail`; los costos fijos y las presentaciones
 * (Task 10) en `useRecipeFinancials`, que reutiliza el detalle para recalcular
 * el resumen y los importes por pieza sin recargar.
 */
definePageMeta({
  layout: "private",
  // `recipe-breadcrumb` resuelve el nombre antes del render (el header del
  // layout se pinta antes que esta página): sin él el SSR mostraba «Receta».
  middleware: ["auth", "recipe-breadcrumb"],
  breadcrumbs: [{ label: "Recetas", href: "/recipes" }, { label: "Receta" }],
});

const {
  recipe,
  recipeId,
  loading,
  loadFailed,
  notFound,
  refresh,
  applyRecipe,
  ingredientCatalog,
  multiplier,
  setMultiplier,
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
  costoDirectoTotal,
  desiredMarginValue,
  fixedCostsPercentageValue,
  updatedText,
  invalidRowKeys,
  addRow,
  removeRow,
  patchRow,
} = useRecipeDetail();

// La miga «Receta» del `definePageMeta` se sustituye por el nombre real en
// cuanto el detalle está disponible (paridad con el baseline).
useBreadcrumbTail(computed(() => recipe.value?.name));

const {
  presentations,
  recipeFixedCosts,
  recipeBatchCost,
  suggestedBatchPrice,
  feedback: financialFeedback,
  createFixedCost,
  updateFixedCost,
  deleteFixedCost,
  createPresentation,
  updatePresentation,
  deletePresentation,
} = useRecipeFinancials({
  recipeId,
  recipe,
  applyRecipe,
  multiplier,
  costoDirectoTotal,
  desiredMarginValue,
  fixedCostsPercentageValue,
  hasAdvancedCosts,
});

/** Última mutación con éxito; recetas y finanzas comparten el espacio. */
const successMessage = computed(
  () => financialFeedback.value ?? feedback.value,
);

/** Alcance del resumen: sus cifras escalan con las mezclas del multiplicador. */
const multiplierLabel = computed(
  () => `${multiplier.value} mezcla${multiplier.value === 1 ? "" : "s"}`,
);

// Paridad con el baseline: una receta inexistente (o de otro usuario) vuelve al
// listado. En SSR lo decide el middleware de migas (que sí espera el dato); en
// navegación cliente el detalle llega después del setup, así que se reacciona
// al cambio.
watch(notFound, (missing) => {
  if (missing) void navigateTo("/recipes", { replace: true });
});

const { hasFeature } = useAuth();
const canDuplicate = computed(() => hasFeature("recipe_duplicate"));

useHead({
  title: () => `${recipe.value?.name ?? "Receta"} | KitchCalc`,
});

const deleteOpen = ref(false);
const duplicateOpen = ref(false);

/** Los dialogs reutilizados esperan el resumen de la receta. */
const summaryRecipe = computed(() =>
  recipe.value ? toRecipeSummary(recipe.value) : null,
);

async function confirmDelete(recipeId: number): Promise<MutationOutcome> {
  return removeRecipe(recipeId);
}

async function confirmDuplicate(recipeId: number): Promise<MutationOutcome> {
  return duplicateRecipe(recipeId);
}
</script>

<template>
  <div class="animate-fade-in" :data-edit-state="isEditMode ? 'edit' : 'view'">
    <div v-if="successMessage" class="mb-6">
      <FeedbackAlert type="success" :message="successMessage" />
    </div>

    <RecipeDetailSkeleton v-if="loading" />

    <Card v-else-if="loadFailed" padding="lg">
      <FeedbackAlert type="error" message="No se pudo cargar la receta." />
      <Button variant="secondary" icon="refresh-cw" @click="refresh()">
        Reintentar
      </Button>
    </Card>

    <template v-else-if="recipe">
      <RecipeDetailHeader
        :recipe-id="recipe.id"
        :name="form.name"
        :category="form.category"
        :saved-category="recipe.category ?? ''"
        :edit-mode="isEditMode"
        :saving="saving"
        :updated-text="updatedText"
        :multiplier="multiplier"
        :can-duplicate="canDuplicate"
        @update:name="form.name = $event"
        @update:category="form.category = $event"
        @save="save()"
        @cancel="cancelEdit()"
        @edit="enterEdit()"
        @duplicate="duplicateOpen = true"
        @delete="deleteOpen = true"
        @multiplier="setMultiplier($event)"
      />

      <div v-if="formError" class="mb-4">
        <RecipeErrorAlert :message="formError" />
      </div>

      <div class="py-6 sm:py-8">
        <FinancialSummary
          v-model:desired-margin="form.desiredMargin"
          v-model:fixed-costs-percentage="form.fixedCostsPercentage"
          title="Resumen financiero"
          :scope="multiplierLabel"
          :rows="financialRows.rows"
          :fields="financialEditFields"
          :editable="isEditMode"
        />
      </div>

      <RecipeTabs
        :tabs="RECIPE_TABS"
        :active="activeTab"
        @select="selectTab($event)"
      />

      <div
        id="panel-ingredientes"
        role="tabpanel"
        aria-labelledby="tab-ingredientes"
        :hidden="activeTab !== 'ingredientes'"
      >
        <RecipeIngredientsPanel
          :edit-mode="isEditMode"
          :show-comments="showComments"
          :multiplier="multiplier"
          :view-ingredients="recipe.ingredients"
          :rows="form.rows"
          :ingredients="ingredientCatalog"
          :unit-options="unitOptions"
          :invalid-keys="invalidRowKeys"
          :add-row="addRow"
          :remove-row="removeRow"
          :patch-row="patchRow"
          @toggle-comments="setCommentsVisible($event)"
        />
      </div>

      <div
        id="panel-costos-fijos"
        role="tabpanel"
        aria-labelledby="tab-costos-fijos"
        :hidden="activeTab !== 'costos-fijos'"
      >
        <RecipeFixedCostsPanel
          :recipe-fixed-costs="recipeFixedCosts"
          :create-fixed-cost="createFixedCost"
          :update-fixed-cost="updateFixedCost"
          :delete-fixed-cost="deleteFixedCost"
        />
      </div>

      <div
        id="panel-presentaciones"
        role="tabpanel"
        aria-labelledby="tab-presentaciones"
        :hidden="activeTab !== 'presentaciones'"
      >
        <PresentationsPanel
          :presentations="presentations"
          :multiplier="multiplier"
          :recipe-batch-cost="recipeBatchCost"
          :suggested-batch-price="suggestedBatchPrice"
          :create-presentation="createPresentation"
          :update-presentation="updatePresentation"
          :delete-presentation="deletePresentation"
        />
      </div>

      <RecipeDeleteDialog
        v-model:open="deleteOpen"
        :recipe="summaryRecipe"
        :submitting="busy === 'delete'"
        :confirm="confirmDelete"
      />

      <RecipeDuplicateDialog
        v-model:open="duplicateOpen"
        :recipe="summaryRecipe"
        :submitting="busy === 'duplicate'"
        :confirm="confirmDuplicate"
      />
    </template>
  </div>
</template>
