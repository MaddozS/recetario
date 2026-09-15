<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  createEmptyIngredientForm,
  isIngredientFormValid,
} from "~/features/ingredients/ingredient-form";
import type { IngredientFormValues } from "~/features/ingredients/ingredient-form";
import type { MutationOutcome } from "~/features/ingredients/useIngredients";
import IngredientCostPreview from "~/features/ingredients/IngredientCostPreview.vue";
import IngredientErrorAlert from "~/features/ingredients/IngredientErrorAlert.vue";
import IngredientFormFields from "~/features/ingredients/IngredientFormFields.vue";

/**
 * Formulario de creación en móvil. El disparador vive en la lista (`lg:hidden`).
 */
const props = defineProps<{
  submitting: boolean;
  submit: (values: IngredientFormValues) => Promise<MutationOutcome>;
}>();

const open = defineModel<boolean>("open", { required: true });

const dialog = ref<{ open: () => void; close: () => void } | null>(null);
const form = reactive(createEmptyIngredientForm());
const error = ref<MutationOutcome | null>(null);

const valid = computed(() => isIngredientFormValid(form));

function syncDialog(): void {
  if (!open.value) {
    dialog.value?.close();
    return;
  }

  Object.assign(form, createEmptyIngredientForm());
  error.value = null;
  dialog.value?.open();
}

watch(open, syncDialog);
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

  Object.assign(form, createEmptyIngredientForm());
  error.value = null;
  open.value = false;
}
</script>

<template>
  <Dialog
    id="create-ingredient-modal"
    ref="dialog"
    size="lg"
    scroll
    :submitting="submitting"
    @close="open = false"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-foreground text-xl font-black">Agregar Insumo</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          Captura la información de tu empaque sin salir del listado.
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
      <IngredientFormFields
        v-model:name="form.name"
        v-model:supplier="form.supplier"
        v-model:brand="form.brand"
        v-model:price="form.price"
        v-model:purchase-quantity="form.purchaseQuantity"
        v-model:unit="form.unit"
        id-prefix="mobile"
      />

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
          icon="plus"
          type="submit"
          :disabled="!valid"
          :loading="submitting"
        >
          {{ submitting ? "Agregando…" : "Agregar Insumo" }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
