<script setup lang="ts">
import type { MutationOutcome } from "~/features/recipes/useRecipes";
import { toRecipeSummary } from "~/features/recipes/recipe-state";
import {
  RECIPE_TABS,
  useRecipeDetail,
} from "~/features/recipes/useRecipeDetail";
import FinancialSummary from "~/features/recipes/FinancialSummary.vue";
import RecipeDeleteDialog from "~/features/recipes/RecipeDeleteDialog.vue";
import RecipeDetailHeader from "~/features/recipes/RecipeDetailHeader.vue";
import RecipeDuplicateDialog from "~/features/recipes/RecipeDuplicateDialog.vue";
import RecipeErrorAlert from "~/features/recipes/RecipeErrorAlert.vue";
import RecipeIngredientsPanel from "~/features/recipes/RecipeIngredientsPanel.vue";
import RecipeTabs from "~/features/recipes/RecipeTabs.vue";

/**
 * Detalle y edición base de receta: página coordinadora delgada. Los datos, el
 * estado de edición (`?edit=true`), el multiplicador (`?multiplier=`) y las
 * mutaciones viven en `useRecipeDetail`; aquí sólo se compone.
 */
definePageMeta({
  layout: "private",
  middleware: "auth",
  breadcrumbs: [{ label: "Recetas", href: "/recipes" }, { label: "Receta" }],
});

const {
  recipe,
  loadFailed,
  notFound,
  refresh,
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
  updatedText,
  invalidRowKeys,
  addRow,
  removeRow,
  patchRow,
} = await useRecipeDetail();

// Paridad con Astro: una receta inexistente (o de otro usuario) vuelve al listado.
if (notFound.value) {
  await navigateTo("/recipes", { replace: true });
}

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
    <div v-if="feedback" class="mb-6">
      <FeedbackAlert type="success" :message="feedback" />
    </div>

    <Card v-if="loadFailed" padding="lg">
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
          :rows="financialRows.rows"
          :highlight-row="financialRows.highlightIndex"
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
        <Card padding="lg">
          <div class="flex flex-wrap items-center gap-3">
            <Badge color="warning">Pendiente: Task 10</Badge>
            <p class="text-muted-foreground text-sm">
              Los costos fijos de la receta se implementan en la Task 10
              (presentaciones, costos fijos y finanzas).
            </p>
          </div>
        </Card>
      </div>

      <div
        id="panel-presentaciones"
        role="tabpanel"
        aria-labelledby="tab-presentaciones"
        :hidden="activeTab !== 'presentaciones'"
      >
        <Card padding="lg">
          <div class="flex flex-wrap items-center gap-3">
            <Badge color="warning">Pendiente: Task 10</Badge>
            <p class="text-muted-foreground text-sm">
              Las presentaciones de venta se implementan en la Task 10
              (presentaciones, costos fijos y finanzas).
            </p>
          </div>
        </Card>
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
