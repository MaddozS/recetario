<script setup lang="ts">
import type { IngredientRecord } from '~/features/ingredients/ingredient-state';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  createEmptyIngredientForm,
  ingredientFormFrom,
  isIngredientFormValid,
} from '~/features/ingredients/ingredient-form';
import type { IngredientFormValues } from '~/features/ingredients/ingredient-form';
import type { MutationOutcome } from '~/features/ingredients/useIngredients';
import IngredientCostPreview from '~/features/ingredients/IngredientCostPreview.vue';
import IngredientErrorAlert from '~/features/ingredients/IngredientErrorAlert.vue';
import IngredientFormFields from '~/features/ingredients/IngredientFormFields.vue';

/**
 * Edición de un ingrediente. Al abrir precarga el formulario y nunca cierra
 * sola en error: conserva lo escrito y muestra la causa dentro del dialog.
 */
const props = defineProps<{
  ingredient: IngredientRecord | null;
  submitting: boolean;
  submit: (values: IngredientFormValues) => Promise<MutationOutcome>;
}>();

const open = defineModel<boolean>('open', { required: true });

const dialog = ref<{ open: () => void; close: () => void } | null>(null);
const form = reactive(createEmptyIngredientForm());
const error = ref<MutationOutcome | null>(null);

const valid = computed(() => isIngredientFormValid(form));

function syncDialog(): void {
  if (!open.value) {
    dialog.value?.close();
    return;
  }

  if (!props.ingredient) return;

  Object.assign(form, ingredientFormFrom(props.ingredient));
  error.value = null;
  dialog.value?.open();
}

watch([open, () => props.ingredient], syncDialog);
onMounted(syncDialog);

function close(): void {
  if (props.submitting) return;
  open.value = false;
}

async function onSubmit(): Promise<void> {
  if (!valid.value || props.submitting) return;

  const outcome = await props.submit({ ...form });
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
    id="edit-ingredient-modal"
    ref="dialog"
    size="xl"
    scroll
    :submitting="submitting"
    @close="open = false"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-foreground text-xl font-black">Editar ingrediente</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          Ajusta todos los datos del ingrediente sin perder consistencia en el costeo.
        </p>
      </div>

      <button
        type="button"
        class="border-border text-muted-foreground hover:bg-background hover:text-secondary-foreground inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
        aria-label="Cerrar modal"
        @click="close"
      >
        <Icon name="lucide:x" :size="18" />
      </button>
    </div>

    <IngredientErrorAlert
      v-if="error && !error.ok"
      class="mt-5"
      :message="error.message"
      :recipes="error.recipes"
      :plan-limit="error.planLimit"
    />

    <form class="mt-5 space-y-4" novalidate @submit.prevent="onSubmit">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <IngredientFormFields
          v-model:name="form.name"
          v-model:supplier="form.supplier"
          v-model:brand="form.brand"
          v-model:price="form.price"
          v-model:purchase-quantity="form.purchaseQuantity"
          v-model:unit="form.unit"
          id-prefix="edit"
          variant="edit"
        />
      </div>

      <div class="border-accent-100 bg-accent-50/70 rounded-2xl border p-4">
        <IngredientCostPreview
          :price="form.price"
          :purchase-quantity="form.purchaseQuantity"
          :unit="form.unit"
        />
      </div>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" @click="close">Cancelar</Button>
        <Button
          variant="primary"
          icon="check"
          type="submit"
          :disabled="!valid"
          :loading="submitting"
        >
          {{ submitting ? 'Guardando…' : 'Guardar cambios' }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
