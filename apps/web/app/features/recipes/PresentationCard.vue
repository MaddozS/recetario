<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import {
  computePresentationMetrics,
  formatPrice,
  formatUnits,
  presentationDraftFromRecord,
} from "./recipe-presentations";
import type {
  PresentationDraft,
  PresentationRecord,
} from "./recipe-presentations";
import { showAdjustedQuantity } from "./recipe-detail-format";
import { parseDecimal } from "./recipe-detail-form";
import type { MutationOutcome } from "./useRecipes";

/**
 * Card de una presentación de venta. Sustituye al custom element
 * `presentation-card` de Astro: la edición es estado reactivo, los importes se
 * derivan con la lógica pura de la feature y la mutación llega como function
 * prop (la card no conoce el API ni recarga la página).
 *
 * El precio de venta conserva la semántica del baseline: sin precio guardado el
 * input muestra el sugerido, pero sólo se persiste si el usuario lo toca.
 */
const props = defineProps<{
  presentation: PresentationRecord;
  multiplier: number;
  /** Insumos + costos fijos de receta (u operativos) de una mezcla. */
  recipeBatchCost: number;
  /** Precio sugerido de la mezcla completa para el margen deseado. */
  suggestedBatchPrice: number;
  save: (
    presentationId: number,
    draft: PresentationDraft,
  ) => Promise<MutationOutcome>;
  remove: (presentationId: number) => Promise<MutationOutcome>;
}>();

const isEditing = ref(false);
const saving = ref(false);
const removing = ref(false);
const error = ref<string | null>(null);
const deleteOpen = ref(false);
const dialog = ref<{ open: () => void; close: () => void } | null>(null);

/** El precio sugerido por pieza: el que se muestra mientras no haya precio guardado. */
const suggestedUnitPrice = computed(
  () =>
    computePresentationMetrics({
      unitsPerBatch: props.presentation.unitsPerBatch,
      multiplier: props.multiplier,
      recipeBatchCost: props.recipeBatchCost,
      suggestedBatchPrice: props.suggestedBatchPrice,
      salePrice: "",
      presentationFixedCosts: props.presentation.fixedCosts ?? [],
    }).unitPriceRecommended,
);

function initialDraft(): PresentationDraft {
  return presentationDraftFromRecord(
    props.presentation,
    suggestedUnitPrice.value,
  );
}

const draft = reactive<PresentationDraft>(initialDraft());

const metrics = computed(() =>
  computePresentationMetrics({
    unitsPerBatch: parseDecimal(draft.unitsPerBatch),
    multiplier: props.multiplier,
    recipeBatchCost: props.recipeBatchCost,
    suggestedBatchPrice: props.suggestedBatchPrice,
    salePrice: draft.salePrice,
    presentationFixedCosts: props.presentation.fixedCosts ?? [],
  }),
);

const adjusted = computed(() => showAdjustedQuantity(props.multiplier));
const unitsLabel = computed(() => formatUnits(metrics.value.totalUnits));

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const TONE_BAR: Record<string, string> = {
  success: "bg-success-solid",
  warning: "bg-warning-solid",
  danger: "bg-danger-solid",
};

const toneText = computed(() => TONE_TEXT[metrics.value.marginTone] ?? "");
const toneBar = computed(() => TONE_BAR[metrics.value.marginTone] ?? "");

/** Ancho del input de precio en `ch` (la fuente es monoespaciada). */
const priceWidth = computed(() =>
  Math.max((draft.salePrice.trim() || "0.00").length + 1, 4),
);

function resetDraft(): void {
  Object.assign(draft, initialDraft());
  error.value = null;
}

function onPriceInput(event: Event): void {
  draft.salePrice = (event.target as HTMLInputElement).value;
  draft.priceDirty = true;
}

function onUnitsInput(event: Event): void {
  draft.unitsPerBatch = (event.target as HTMLInputElement).value;
}

function onNameInput(event: Event): void {
  draft.name = (event.target as HTMLInputElement).value;
}

function toggleEdit(): void {
  if (saving.value) return;
  error.value = null;

  if (isEditing.value) {
    isEditing.value = false;
    resetDraft();
    return;
  }

  resetDraft();
  isEditing.value = true;
}

async function onSubmit(): Promise<void> {
  if (saving.value) return;

  saving.value = true;
  error.value = null;

  try {
    const outcome = await props.save(props.presentation.id, { ...draft });
    if (!outcome.ok) {
      error.value = outcome.message;
      return;
    }

    isEditing.value = false;
    // Tras el guardado el registro llega por props (el composable aplica la
    // respuesta del API): se espera el render para resembrar el borrador con
    // los valores canónicos del servidor.
    await nextTick();
    resetDraft();
  } finally {
    saving.value = false;
  }
}

async function onDelete(): Promise<void> {
  if (removing.value) return;

  removing.value = true;

  try {
    const outcome = await props.remove(props.presentation.id);
    deleteOpen.value = false;
    if (!outcome.ok) error.value = outcome.message;
  } finally {
    removing.value = false;
  }
}

function syncDialog(): void {
  if (deleteOpen.value && !removing.value) {
    dialog.value?.open();
    return;
  }
  dialog.value?.close();
}

watch(deleteOpen, syncDialog);
watch(
  () => props.presentation,
  () => {
    if (!isEditing.value) resetDraft();
  },
);
onMounted(syncDialog);
</script>

<template>
  <Card
    class="flex h-full flex-col"
    data-presentation-card
    :data-presentation-id="presentation.id"
    :data-presentation-mode="isEditing ? 'edit' : 'display'"
    :data-margin-tone="metrics.marginTone"
    :data-units="presentation.unitsPerBatch"
    :data-price="presentation.salePrice ?? ''"
  >
    <form
      class="flex h-full grow flex-col"
      novalidate
      @submit.prevent="onSubmit"
    >
      <div class="mb-2 flex items-start justify-between gap-3">
        <input
          name="presentationName"
          type="text"
          maxlength="120"
          :readonly="!isEditing"
          :value="draft.name"
          class="presentation-name focus:ring-accent-500/20 text-foreground font-display -ml-1 w-full min-w-0 rounded-lg border-none bg-transparent p-1 text-lg font-bold focus:ring-2"
          @input="onNameInput"
        />

        <div class="flex shrink-0 items-center gap-1">
          <Button
            v-if="isEditing"
            variant="iconDanger"
            icon-only
            icon="trash-2"
            aria-label="Eliminar presentación"
            title="Eliminar"
            data-presentation-delete
            @click="deleteOpen = true"
          />
          <Button
            variant="iconAccent"
            icon-only
            icon="pencil"
            :aria-label="isEditing ? 'Cancelar edición' : 'Editar presentación'"
            :aria-pressed="isEditing ? 'true' : 'false'"
            :title="isEditing ? 'Cancelar edición' : 'Editar'"
            :class="isEditing ? 'bg-muted' : ''"
            data-presentation-edit
            @click="toggleEdit"
          />
        </div>
      </div>

      <div class="mb-6 flex flex-wrap items-center gap-2">
        <div
          class="border-border bg-background text-muted-foreground focus-within:ring-accent-500/20 focus-within:border-accent-300 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-all focus-within:ring-2"
        >
          <span>Rinde:</span>
          <input
            name="unitsPerBatch"
            type="number"
            step="any"
            min="0.01"
            :readonly="!isEditing"
            :value="draft.unitsPerBatch"
            class="presentation-units text-foreground w-8 border-none bg-transparent p-0 text-center font-mono text-xs font-semibold read-only:pointer-events-none focus:ring-0"
            @input="onUnitsInput"
          />
          <span>piezas</span>
        </div>

        <div
          v-if="adjusted"
          class="border-accent-200 bg-accent-50 text-accent-700 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-all"
        >
          <span class="font-semibold">Con x{{ multiplier }}:</span>
          <span class="yield-value font-mono font-semibold" data-yield>
            {{ unitsLabel }}
          </span>
          <span>piezas</span>
        </div>
      </div>

      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div class="shrink-0 space-y-0.5">
          <p
            class="text-subtle-foreground text-[11px] font-bold tracking-[0.16em] uppercase"
          >
            Costo unitario
          </p>
          <p
            class="unit-cost-display text-foreground font-mono text-lg font-semibold tabular-nums"
            data-unit-cost
          >
            ${{ formatPrice(metrics.unitCost) }}
          </p>
        </div>

        <div
          class="bg-accent-50/50 border-accent-100 flex max-w-65 grow flex-wrap items-center justify-between gap-y-1 rounded-xl border px-2.5 py-2 sm:px-3 sm:py-2.5"
        >
          <div class="flex min-w-0 shrink-0 flex-col">
            <p
              class="text-accent-700 mb-0.5 text-[11px] font-bold tracking-[0.16em] uppercase"
            >
              Precio Venta
            </p>
            <p class="text-muted-foreground text-[10px]">
              Sugerido:
              <span
                class="recommended-price-display font-mono font-semibold"
                data-recommended-price
              >
                ${{ formatPrice(metrics.unitPriceRecommended) }}
              </span>
            </p>
          </div>
          <div
            class="focus-within:bg-card focus-within:ring-accent-500/20 focus-within:border-accent-300 relative -mr-1 flex shrink-0 items-center justify-end rounded-md border border-transparent px-1 transition-all focus-within:ring-2"
          >
            <span
              class="text-accent-600 pointer-events-none mr-0.5 font-mono text-[20px] font-semibold"
            >
              $
            </span>
            <input
              name="salePrice"
              type="text"
              inputmode="decimal"
              :readonly="!isEditing"
              :value="draft.salePrice"
              :style="{ width: `${priceWidth}ch` }"
              class="presentation-price text-accent-600 max-w-full min-w-[3ch] border-none bg-transparent p-0 text-left font-mono text-[20px] font-semibold tabular-nums read-only:pointer-events-none focus:ring-0"
              @input="onPriceInput"
            />
          </div>
        </div>
      </div>

      <hr class="border-border-light my-1 mt-4 mb-5" />

      <div class="mt-auto flex items-end justify-between gap-4">
        <div class="space-y-0.5">
          <p
            class="text-subtle-foreground text-[11px] font-bold tracking-[0.16em] uppercase"
          >
            Ganancia / Pz
          </p>
          <p
            class="profit-display font-mono text-lg font-semibold tabular-nums"
            :class="toneText"
            data-unit-profit
          >
            ${{ formatPrice(metrics.unitProfit) }}
          </p>
        </div>

        <div class="w-[60%] max-w-60 pb-1">
          <div class="mb-2 flex items-center justify-between text-xs">
            <span
              class="margin-label"
              :class="toneText"
              title="Margen sobre precio: (precio - costo) / precio"
              data-margin-label
            >
              {{ metrics.marginLabel }}
            </span>
            <span
              class="margin-percent-display text-foreground font-mono font-semibold"
              data-margin-percent
            >
              {{ metrics.marginPercent.toFixed(1) }}%
            </span>
          </div>
          <div class="bg-muted h-2.5 overflow-hidden rounded-full">
            <div
              class="margin-bar h-full rounded-full transition-all duration-500"
              :class="toneBar"
              :style="{ width: `${metrics.barWidth}%` }"
            />
          </div>
        </div>
      </div>

      <div
        v-if="isEditing"
        class="save-bar border-border-light mt-5 border-t pt-4"
      >
        <Button
          variant="primary"
          icon="check"
          type="submit"
          :loading="saving"
          class="w-full"
          data-presentation-save
        >
          Guardar Cambios
        </Button>
      </div>

      <p
        v-if="error"
        class="text-danger presentation-error mt-2 text-xs font-semibold"
        role="alert"
        data-presentation-error
      >
        {{ error }}
      </p>
    </form>

    <Dialog
      :id="`delete-presentation-${presentation.id}`"
      ref="dialog"
      :submitting="removing"
      @close="deleteOpen = false"
    >
      <div class="flex items-start gap-3">
        <div
          class="bg-danger-bg text-danger flex h-11 w-11 items-center justify-center rounded-2xl"
        >
          <Icon name="lucide:trash-2" :size="18" />
        </div>
        <div>
          <h2 class="text-foreground text-lg font-bold">
            Confirmar eliminación
          </h2>
          <p class="text-muted-foreground mt-2 text-sm">
            ¿Eliminar esta presentación? Esta acción no se puede deshacer.
          </p>
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          :disabled="removing"
          @click="deleteOpen = false"
        >
          Cancelar
        </Button>
        <Button
          variant="danger"
          icon="trash-2"
          :loading="removing"
          data-presentation-confirm-delete
          @click="onDelete"
        >
          Eliminar
        </Button>
      </div>
    </Dialog>
  </Card>
</template>
