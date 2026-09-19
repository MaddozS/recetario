<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { validatePresentationDraft } from "./recipe-presentations";
import type { PresentationDraft } from "./recipe-presentations";
import type { MutationOutcome } from "./useRecipes";

/**
 * Alta de una presentación (paridad con el dialog del baseline). Valida con la
 * lógica pura antes de enviar y nunca cierra sola en error: conserva lo escrito
 * y muestra la causa dentro del dialog.
 */
const props = defineProps<{
  submit: (draft: PresentationDraft) => Promise<MutationOutcome>;
}>();

const open = defineModel<boolean>("open", { required: true });

const dialog = ref<{ open: () => void; close: () => void } | null>(null);
const draft = reactive<PresentationDraft>(emptyDraft());
const error = ref<string | null>(null);
const submitting = ref(false);

const validation = computed(() => validatePresentationDraft(draft));

function emptyDraft(): PresentationDraft {
  return {
    name: "",
    unitsPerBatch: "",
    salePrice: "",
    priceDirty: false,
  };
}

function syncDialog(): void {
  if (!open.value) {
    dialog.value?.close();
    return;
  }

  Object.assign(draft, emptyDraft());
  error.value = null;
  dialog.value?.open();
}

watch(open, syncDialog);
onMounted(syncDialog);

function close(): void {
  if (submitting.value) return;
  open.value = false;
}

async function onSubmit(): Promise<void> {
  if (submitting.value || !validation.value.valid) return;

  submitting.value = true;
  error.value = null;

  try {
    const outcome = await props.submit({ ...draft });
    if (!outcome.ok) {
      error.value = outcome.message;
      return;
    }

    open.value = false;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Dialog
    id="create-presentation-dialog"
    ref="dialog"
    :submitting="submitting"
    scroll
    @close="open = false"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p
          class="text-accent-700 text-xs font-black tracking-[0.18em] uppercase"
        >
          Nueva presentación
        </p>
        <h2 class="text-foreground mt-2 text-xl font-black">
          Define una nueva venta por pieza
        </h2>
        <p class="text-muted-foreground mt-2 text-sm">
          Puedes ajustar nombre, rendimiento y precio desde la tarjeta después.
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

    <form class="mt-6" novalidate @submit.prevent="onSubmit">
      <label
        class="text-secondary-foreground block text-sm font-semibold"
        for="create-presentation-name"
      >
        Nombre de la presentación
      </label>
      <input
        id="create-presentation-name"
        v-model="draft.name"
        name="presentationName"
        type="text"
        maxlength="120"
        placeholder="Ej. Caja de 6"
        class="border-border bg-background text-foreground placeholder:text-subtle-foreground focus:border-accent-500 focus:ring-accent-500/20 mt-2 w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none focus:ring-2"
      />

      <div class="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
        <div>
          <label
            class="text-secondary-foreground block text-sm font-semibold"
            for="create-presentation-units"
          >
            Piezas por mezcla
          </label>
          <input
            id="create-presentation-units"
            v-model="draft.unitsPerBatch"
            name="unitsPerBatch"
            type="text"
            inputmode="decimal"
            placeholder="12"
            class="border-border bg-background text-foreground placeholder:text-subtle-foreground focus:border-accent-500 focus:ring-accent-500/20 mt-2 w-full rounded-xl border px-4 py-3 font-mono text-sm transition-colors outline-none focus:ring-2"
          />
        </div>

        <div>
          <label
            class="text-secondary-foreground block text-sm font-semibold"
            for="create-presentation-price"
          >
            Precio de venta
          </label>
          <input
            id="create-presentation-price"
            v-model="draft.salePrice"
            name="salePrice"
            type="text"
            inputmode="decimal"
            placeholder="Opcional"
            class="border-border bg-background text-foreground placeholder:text-subtle-foreground focus:border-accent-500 focus:ring-accent-500/20 mt-2 w-full rounded-xl border px-4 py-3 font-mono text-sm transition-colors outline-none focus:ring-2"
          />
        </div>
      </div>

      <p
        v-if="error"
        class="text-danger mt-4 text-xs font-semibold"
        role="alert"
        data-presentation-create-error
      >
        {{ error }}
      </p>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" :disabled="submitting" @click="close">
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon="plus"
          type="submit"
          :disabled="!validation.valid"
          :loading="submitting"
          data-presentation-create-submit
        >
          Crear presentación
        </Button>
      </div>
    </form>
  </Dialog>
</template>
