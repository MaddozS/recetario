<script setup lang="ts">
import type { IngredientRecord } from "~/features/ingredients/ingredient-state";
import { computed, onMounted, ref, watch } from "vue";
import type { MutationOutcome } from "~/features/ingredients/useIngredients";
import IngredientErrorAlert from "~/features/ingredients/IngredientErrorAlert.vue";

/**
 * Confirmación de borrado. El conflicto `ingredient_in_use` se muestra aquí
 * dentro, con las recetas que lo usan, sin cerrar el dialog.
 */
const props = defineProps<{
  ingredient: IngredientRecord | null;
  submitting: boolean;
  confirm: (ingredientId: number) => Promise<MutationOutcome>;
}>();

const open = defineModel<boolean>("open", { required: true });

const dialog = ref<{ open: () => void; close: () => void } | null>(null);
const error = ref<MutationOutcome | null>(null);

const description = computed(() =>
  props.ingredient
    ? `¿Estás seguro de que deseas eliminar el ingrediente "${props.ingredient.name}"? Esta acción no se puede deshacer.`
    : "¿Eliminar este ingrediente? Esta acción no se puede deshacer.",
);

function syncDialog(): void {
  if (!open.value) {
    dialog.value?.close();
    return;
  }

  error.value = null;
  dialog.value?.open();
}

watch(open, syncDialog);
onMounted(syncDialog);

function close(): void {
  if (props.submitting) return;
  open.value = false;
}

async function onConfirm(): Promise<void> {
  if (!props.ingredient || props.submitting) return;

  const outcome = await props.confirm(props.ingredient.id);
  if (!outcome.ok) {
    error.value = outcome;
    return;
  }

  error.value = null;
  open.value = false;
}
</script>

<template>
  <Dialog
    id="delete-confirm-modal"
    ref="dialog"
    :submitting="submitting"
    @close="open = false"
  >
    <div class="flex items-start gap-3">
      <div
        class="bg-danger-bg text-danger flex h-11 w-11 items-center justify-center rounded-2xl"
      >
        <Icon name="lucide:trash-2" :size="18" />
      </div>
      <div>
        <h2 class="text-foreground text-lg font-bold">Confirmar eliminación</h2>
        <p class="text-muted-foreground mt-2 text-sm">{{ description }}</p>
      </div>
    </div>

    <IngredientErrorAlert
      v-if="error && !error.ok"
      class="mt-6"
      :message="error.message"
      :recipes="error.recipes"
      :plan-limit="error.planLimit"
    />

    <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button variant="secondary" @click="close">Cancelar</Button>
      <Button
        variant="danger"
        icon="trash-2"
        type="button"
        :loading="submitting"
        @click="onConfirm"
      >
        {{ submitting ? "Eliminando…" : "Eliminar" }}
      </Button>
    </div>
  </Dialog>
</template>
