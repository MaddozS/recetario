<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { RecipeMutationFailure } from "~/features/recipes/recipe-messages";
import type { RecipeRecord } from "~/features/recipes/recipe-state";
import type { MutationOutcome } from "~/features/recipes/useRecipes";
import RecipeErrorAlert from "~/features/recipes/RecipeErrorAlert.vue";

/**
 * Confirmación de duplicado. El padre decide qué hacer con el id devuelto
 * (paridad con el baseline: navegar a la copia en `?edit=true`).
 */
const props = defineProps<{
  recipe: RecipeRecord | null;
  submitting: boolean;
  confirm: (recipeId: number) => Promise<MutationOutcome>;
}>();

const open = defineModel<boolean>("open", { required: true });

const dialog = ref<{ open: () => void; close: () => void } | null>(null);
const failure = ref<RecipeMutationFailure | null>(null);

function syncDialog(): void {
  if (!open.value) {
    dialog.value?.close();
    return;
  }

  failure.value = null;
  dialog.value?.open();
}

watch(open, syncDialog);
onMounted(syncDialog);

function close(): void {
  if (props.submitting) return;
  open.value = false;
}

async function onConfirm(): Promise<void> {
  if (!props.recipe || props.submitting) return;

  const outcome = await props.confirm(props.recipe.id);
  if (!outcome.ok) {
    failure.value = {
      message: outcome.message,
      planLimit: outcome.planLimit,
    };
    return;
  }

  failure.value = null;
  open.value = false;
}
</script>

<template>
  <Dialog
    id="duplicate-recipe-modal"
    ref="dialog"
    :submitting="submitting"
    @close="open = false"
  >
    <div class="flex items-start gap-3">
      <div
        class="bg-accent-50 text-accent-600 flex h-11 w-11 items-center justify-center rounded-2xl"
      >
        <Icon name="lucide:copy" :size="18" />
      </div>
      <div>
        <h2 class="text-foreground text-lg font-bold">Duplicar receta</h2>
        <p class="text-muted-foreground mt-2 text-sm">
          Se creará una copia de esta receta con todos sus ingredientes y
          presentaciones.
        </p>
      </div>
    </div>

    <RecipeErrorAlert
      v-if="failure"
      class="mt-5"
      :message="failure.message"
      :plan-limit="failure.planLimit"
    />

    <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button variant="secondary" @click="close">Cancelar</Button>
      <Button
        variant="primary"
        icon="copy"
        :disabled="recipe === null"
        :loading="submitting"
        @click="onConfirm"
      >
        Duplicar
      </Button>
    </div>
  </Dialog>
</template>
