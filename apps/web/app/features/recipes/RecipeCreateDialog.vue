<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import {
  createEmptyRecipeForm,
  isRecipeFormValid,
} from "~/features/recipes/recipe-form";
import type { RecipeFormValues } from "~/features/recipes/recipe-form";
import type { RecipeMutationFailure } from "~/features/recipes/recipe-messages";
import type { MutationOutcome } from "~/features/recipes/useRecipes";
import RecipeErrorAlert from "~/features/recipes/RecipeErrorAlert.vue";

/**
 * Creación de receta: un único dialog para todos los breakpoints (paridad con
 * Astro, que no tenía formulario en card). El botón que lo abre vive en la
 * toolbar y en el estado vacío.
 */
const props = defineProps<{
  submitting: boolean;
  submit: (values: RecipeFormValues) => Promise<MutationOutcome>;
}>();

const open = defineModel<boolean>("open", { required: true });

const dialog = ref<{ open: () => void; close: () => void } | null>(null);
const form = reactive(createEmptyRecipeForm());
const failure = ref<RecipeMutationFailure | null>(null);

const valid = computed(() => isRecipeFormValid(form));

function syncDialog(): void {
  if (!open.value) {
    dialog.value?.close();
    return;
  }

  Object.assign(form, createEmptyRecipeForm());
  failure.value = null;
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
    failure.value = {
      message: outcome.message,
      planLimit: outcome.planLimit,
    };
    return;
  }

  Object.assign(form, createEmptyRecipeForm());
  failure.value = null;
  open.value = false;
}
</script>

<template>
  <Dialog
    id="create-recipe-modal"
    ref="dialog"
    :submitting="submitting"
    @close="open = false"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p
          class="text-accent-500 text-xs font-black tracking-[0.18em] uppercase"
        >
          Nueva receta
        </p>
        <h2 class="text-foreground mt-2 text-xl font-black">
          Escribe el nombre inicial
        </h2>
        <p class="text-muted-foreground mt-2 text-sm">
          Puedes cambiarlo después desde la vista de edición.
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

    <RecipeErrorAlert
      v-if="failure"
      class="mt-5"
      :message="failure.message"
      :plan-limit="failure.planLimit"
    />

    <form class="mt-5" novalidate @submit.prevent="onSubmit">
      <Input
        id="create-recipe-name"
        v-model="form.name"
        name="recipeName"
        label="Nombre de la receta"
        required
        placeholder="Ej. Brownie clásico"
        maxlength="120"
      />

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" @click="close">Cancelar</Button>
        <Button
          variant="primary"
          icon="plus"
          type="submit"
          :disabled="!valid"
          :loading="submitting"
        >
          Crear receta
        </Button>
      </div>
    </form>
  </Dialog>
</template>
