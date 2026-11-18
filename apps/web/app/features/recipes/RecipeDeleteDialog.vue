<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { RecipeMutationFailure } from '~/features/recipes/recipe-messages';
import type { RecipeRecord } from '~/features/recipes/recipe-state';
import type { MutationOutcome } from '~/features/recipes/useRecipes';
import RecipeErrorAlert from '~/features/recipes/RecipeErrorAlert.vue';

/**
 * Confirmación de borrado desde el listado. Mejora registrada sobre el baseline (allí
 * el menú de la card no ofrecía Eliminar): el borrado se resuelve en sitio, sin
 * recargar.
 */
const props = defineProps<{
  recipe: RecipeRecord | null;
  submitting: boolean;
  confirm: (recipeId: number) => Promise<MutationOutcome>;
}>();

const open = defineModel<boolean>('open', { required: true });

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
    failure.value = { message: outcome.message };
    return;
  }

  failure.value = null;
  open.value = false;
}
</script>

<template>
  <Dialog id="delete-recipe-modal" ref="dialog" :submitting="submitting" @close="open = false">
    <div class="flex items-start gap-3">
      <div class="bg-danger-bg text-danger flex h-11 w-11 items-center justify-center rounded-2xl">
        <Icon name="lucide:trash-2" :size="18" />
      </div>
      <div>
        <h2 class="text-foreground text-lg font-bold">Confirmar eliminación</h2>
        <p class="text-muted-foreground mt-2 text-sm">
          ¿Eliminar esta receta? Esta acción no se puede deshacer.
        </p>
      </div>
    </div>

    <RecipeErrorAlert v-if="failure" class="mt-5" :message="failure.message" />

    <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button variant="secondary" @click="close">Cancelar</Button>
      <Button
        variant="danger"
        icon="trash-2"
        :disabled="recipe === null"
        :loading="submitting"
        @click="onConfirm"
      >
        Eliminar
      </Button>
    </div>
  </Dialog>
</template>
