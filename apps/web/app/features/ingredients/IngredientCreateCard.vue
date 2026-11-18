<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  createEmptyIngredientForm,
  isIngredientFormValid,
} from '~/features/ingredients/ingredient-form';
import type { IngredientFormValues } from '~/features/ingredients/ingredient-form';
import type { MutationOutcome } from '~/features/ingredients/useIngredients';
import IngredientCostPreview from '~/features/ingredients/IngredientCostPreview.vue';
import IngredientErrorAlert from '~/features/ingredients/IngredientErrorAlert.vue';
import IngredientFormFields from '~/features/ingredients/IngredientFormFields.vue';

/**
 * Formulario de creación de escritorio (`hidden lg:block`). En móvil el mismo
 * formulario vive en `IngredientCreateDialog`.
 */
const props = defineProps<{
  submitting: boolean;
  submit: (values: IngredientFormValues) => Promise<MutationOutcome>;
}>();

const form = reactive(createEmptyIngredientForm());
const error = ref<MutationOutcome | null>(null);

const valid = computed(() => isIngredientFormValid(form));

async function onSubmit(): Promise<void> {
  if (!valid.value || props.submitting) return;

  const outcome = await props.submit({ ...form });
  if (!outcome.ok) {
    error.value = outcome;
    return;
  }

  Object.assign(form, createEmptyIngredientForm());
  error.value = null;
}
</script>

<template>
  <Card padding="lg" class="mb-6 hidden lg:block">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h2 class="text-foreground text-2xl font-black">Agregar Insumo</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          Captura la información de tus ingredientes y empaques.
        </p>
      </div>

      <div class="text-muted-foreground text-left text-xs xl:text-right">
        <p><span class="text-danger font-bold">*</span> Campos obligatorios</p>
        <p>Usa punto (.) o coma (,) para decimales</p>
      </div>
    </div>

    <IngredientErrorAlert
      v-if="error && !error.ok"
      class="mt-6"
      :message="error.message"
      :recipes="error.recipes"
      :plan-limit="error.planLimit"
    />

    <form class="mt-6" novalidate @submit.prevent="onSubmit">
      <div
        class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.5fr)]"
      >
        <IngredientFormFields
          v-model:name="form.name"
          v-model:supplier="form.supplier"
          v-model:brand="form.brand"
          v-model:price="form.price"
          v-model:purchase-quantity="form.purchaseQuantity"
          v-model:unit="form.unit"
          id-prefix="desktop"
        />
      </div>

      <div
        class="border-accent-100 bg-accent-50/70 mt-5 flex flex-col gap-4 rounded-2xl border p-4 xl:flex-row xl:items-center xl:justify-between"
      >
        <IngredientCostPreview
          :price="form.price"
          :purchase-quantity="form.purchaseQuantity"
          :unit="form.unit"
        />

        <Button
          variant="primary"
          icon="plus"
          type="submit"
          :disabled="!valid"
          :loading="submitting"
          class="shadow-accent-200 min-w-52 shadow-sm"
        >
          {{ submitting ? 'Agregando…' : 'Agregar Insumo' }}
        </Button>
      </div>
    </form>
  </Card>
</template>
