<script setup lang="ts">
import { computed, ref } from "vue";
import type { RecipeFormValues } from "~/features/recipes/recipe-form";
import type { RecipeRecord } from "~/features/recipes/recipe-state";
import RecipeCreateDialog from "~/features/recipes/RecipeCreateDialog.vue";
import RecipeDeleteDialog from "~/features/recipes/RecipeDeleteDialog.vue";
import RecipeDuplicateDialog from "~/features/recipes/RecipeDuplicateDialog.vue";
import RecentRecipes from "~/features/recipes/RecentRecipes.vue";
import RecipesEmptyState from "~/features/recipes/RecipesEmptyState.vue";
import RecipesGrid from "~/features/recipes/RecipesGrid.vue";
import RecipesInsights from "~/features/recipes/RecipesInsights.vue";
import RecipesSkeleton from "~/features/recipes/RecipesSkeleton.vue";
import RecipesStats from "~/features/recipes/RecipesStats.vue";
import RecipesToolbar from "~/features/recipes/RecipesToolbar.vue";
import type { MutationOutcome } from "~/features/recipes/useRecipes";
import { useRecipes } from "~/features/recipes/useRecipes";

definePageMeta({
  layout: "private",
  middleware: "auth",
  breadcrumbs: [{ label: "Recetas" }],
});

useHead({ title: "Recetas | KitchCalc" });

const {
  recipes,
  loading,
  loadFailed,
  refresh,
  searchQuery,
  category,
  filteredRecipes,
  categoryOptions,
  uncategorizedTotal,
  stats,
  recent,
  mutation,
  selectCategory,
  createRecipe,
  duplicateRecipe,
  removeRecipe,
} = useRecipes();

const { hasFeature } = useAuth();
const canDuplicate = computed(() => hasFeature("recipe_duplicate"));

const feedback = ref<string | null>(null);
const createOpen = ref(false);
const duplicateOpen = ref(false);
const deleteOpen = ref(false);
const duplicating = ref<RecipeRecord | null>(null);
const deleting = ref<RecipeRecord | null>(null);

function openDuplicate(recipe: RecipeRecord): void {
  duplicating.value = recipe;
  duplicateOpen.value = true;
}

function openDelete(recipe: RecipeRecord): void {
  deleting.value = recipe;
  deleteOpen.value = true;
}

/** Crear navega a la vista de edición de la receta nueva (paridad el baseline). */
async function submitCreate(
  values: RecipeFormValues,
): Promise<MutationOutcome> {
  const outcome = await createRecipe(values);
  if (outcome.ok) {
    await navigateTo(`/recipes/${outcome.id}?edit=true`);
  }
  return outcome;
}

async function submitDuplicate(recipeId: number): Promise<MutationOutcome> {
  const outcome = await duplicateRecipe(recipeId);
  if (outcome.ok) {
    await navigateTo(`/recipes/${outcome.id}?edit=true`);
  }
  return outcome;
}

async function submitDelete(recipeId: number): Promise<MutationOutcome> {
  const outcome = await removeRecipe(recipeId);
  if (outcome.ok) feedback.value = "Receta eliminada correctamente.";
  return outcome;
}
</script>

<template>
  <div class="animate-fade-in">
    <div v-if="feedback" class="mb-6">
      <FeedbackAlert type="success" :message="feedback" />
    </div>

    <RecipesSkeleton v-if="loading" />

    <Card v-else-if="loadFailed" padding="lg">
      <FeedbackAlert
        type="error"
        message="No se pudieron cargar las recetas."
      />
      <Button variant="secondary" icon="refresh-cw" @click="refresh()">
        Reintentar
      </Button>
    </Card>

    <RecipesEmptyState
      v-else-if="recipes.length === 0"
      @create="createOpen = true"
    />

    <div v-else class="space-y-8">
      <RecipesStats
        :recipe-count="stats.recipeCount"
        :category-count="stats.categoryCount"
        :ingredient-count="stats.ingredientCount"
      />

      <RecipesInsights
        :incomplete-count="stats.incompleteCount"
        :without-category-count="stats.withoutCategoryCount"
        :last-updated-at="stats.lastUpdatedAt"
      />

      <RecentRecipes v-if="recent.length > 0" :recipes="recent" />

      <RecipesToolbar
        v-model:search="searchQuery"
        :category="category"
        :categories="categoryOptions"
        :uncategorized-count="uncategorizedTotal"
        @create="createOpen = true"
        @select-category="selectCategory"
      />

      <RecipesGrid
        :recipes="filteredRecipes"
        :can-duplicate="canDuplicate"
        @duplicate="openDuplicate"
        @delete="openDelete"
      />
    </div>

    <RecipeCreateDialog
      v-model:open="createOpen"
      :submitting="mutation === 'create'"
      :submit="submitCreate"
    />

    <RecipeDuplicateDialog
      v-model:open="duplicateOpen"
      :recipe="duplicating"
      :submitting="mutation === 'duplicate'"
      :confirm="submitDuplicate"
    />

    <RecipeDeleteDialog
      v-model:open="deleteOpen"
      :recipe="deleting"
      :submitting="mutation === 'delete'"
      :confirm="submitDelete"
    />
  </div>
</template>
