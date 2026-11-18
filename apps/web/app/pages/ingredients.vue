<script setup lang="ts">
import type { IngredientRecord } from '~/features/ingredients/ingredient-state';
import type { IngredientFormValues } from '~/features/ingredients/ingredient-form';
import IngredientCreateCard from '~/features/ingredients/IngredientCreateCard.vue';
import IngredientCreateDialog from '~/features/ingredients/IngredientCreateDialog.vue';
import IngredientDeleteDialog from '~/features/ingredients/IngredientDeleteDialog.vue';
import IngredientEditDialog from '~/features/ingredients/IngredientEditDialog.vue';
import IngredientsListCard from '~/features/ingredients/IngredientsListCard.vue';
import IngredientsSkeleton from '~/features/ingredients/IngredientsSkeleton.vue';
import type { MutationOutcome } from '~/features/ingredients/useIngredients';
import { useIngredients } from '~/features/ingredients/useIngredients';

definePageMeta({
  layout: 'private',
  middleware: 'auth',
  breadcrumbs: [{ label: 'Ingredientes' }],
});

useHead({ title: 'Ingredientes | KitchCalc' });

const {
  ingredients,
  usage,
  loading,
  loadFailed,
  refresh,
  searchQuery,
  filteredIngredients,
  mutation,
  createIngredient,
  updateIngredient,
  removeIngredient,
} = useIngredients();

const feedback = ref<string | null>(null);
const createOpen = ref(false);
const editOpen = ref(false);
const deleteOpen = ref(false);
const editing = ref<IngredientRecord | null>(null);
const deleting = ref<IngredientRecord | null>(null);

function openEdit(ingredient: IngredientRecord): void {
  editing.value = ingredient;
  editOpen.value = true;
}

function openDelete(ingredient: IngredientRecord): void {
  deleting.value = ingredient;
  deleteOpen.value = true;
}

async function submitCreate(values: IngredientFormValues): Promise<MutationOutcome> {
  const outcome = await createIngredient(values);
  if (outcome.ok) feedback.value = 'Ingrediente agregado correctamente.';
  return outcome;
}

async function submitUpdate(values: IngredientFormValues): Promise<MutationOutcome> {
  if (!editing.value) {
    return { ok: false, message: 'No se pudo identificar el ingrediente.' };
  }

  const outcome = await updateIngredient(editing.value.id, values);
  if (outcome.ok) feedback.value = 'Ingrediente actualizado correctamente.';
  return outcome;
}

async function submitDelete(ingredientId: number): Promise<MutationOutcome> {
  const outcome = await removeIngredient(ingredientId);
  if (outcome.ok) feedback.value = 'Ingrediente eliminado correctamente.';
  return outcome;
}
</script>

<template>
  <div class="animate-fade-in">
    <div v-if="feedback" class="mb-6">
      <FeedbackAlert type="success" :message="feedback" />
    </div>

    <IngredientsSkeleton v-if="loading" />

    <Card v-else-if="loadFailed" padding="lg">
      <FeedbackAlert type="error" message="No se pudieron cargar los ingredientes." />
      <Button variant="secondary" icon="refresh-cw" @click="refresh()"> Reintentar </Button>
    </Card>

    <template v-else>
      <IngredientCreateCard :submit="submitCreate" :submitting="mutation === 'create'" />

      <IngredientsListCard
        v-model:search="searchQuery"
        :ingredients="filteredIngredients"
        :total="ingredients.length"
        :usage="usage"
        @create="createOpen = true"
        @edit="openEdit"
        @delete="openDelete"
      />
    </template>

    <IngredientCreateDialog
      v-model:open="createOpen"
      :submit="submitCreate"
      :submitting="mutation === 'create'"
    />

    <IngredientEditDialog
      v-model:open="editOpen"
      :ingredient="editing"
      :submit="submitUpdate"
      :submitting="mutation === 'update'"
    />

    <IngredientDeleteDialog
      v-model:open="deleteOpen"
      :ingredient="deleting"
      :confirm="submitDelete"
      :submitting="mutation === 'delete'"
    />
  </div>
</template>
