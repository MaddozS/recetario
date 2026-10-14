<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import type { MutationOutcome } from './useRecipes';
import {
  FIXED_COST_BASE_BADGE_COLORS,
  FIXED_COST_BASE_LABELS,
  FIXED_COST_TYPE_BADGE_COLORS,
  FIXED_COST_TYPE_LABELS,
  emptyFixedCostDraft,
  fixedCostDraftFromRecord,
  fixedCostDisplayValue,
  fixedCostHoursLabel,
  fixedCostHoursRequired,
} from './recipe-fixed-costs';
import type {
  FixedCostBase,
  FixedCostDraft,
  FixedCostRecord,
  FixedCostType,
} from './recipe-fixed-costs';

/**
 * Card de un costo fijo de la receta. Sustituye al custom element
 * `fixed-cost-card` del baseline: aquí el modo (vista/edición/creación) es estado
 * reactivo y la mutación llega como function prop, así que la card no toca el
 * DOM ni recarga la página.
 *
 * El modo creación nace en edición y se descarta con «Cancelar»; al guardar
 * avisa al panel, que deja de mostrarlo porque la card real llega por props.
 */
const props = withDefaults(
  defineProps<{
    fixedCost?: FixedCostRecord | null;
    mode?: 'display' | 'create';
    save: (draft: FixedCostDraft) => Promise<MutationOutcome>;
    remove?: (fixedCostId: number) => Promise<MutationOutcome>;
  }>(),
  { fixedCost: null, mode: 'display' }
);

const emit = defineEmits<{ cancel: []; saved: [] }>();

const isCreate = computed(() => props.mode === 'create');
const isEditing = ref(isCreate.value);
const saving = ref(false);
const removing = ref(false);
const error = ref<string | null>(null);
const deleteOpen = ref(false);
const dialog = ref<{ open: () => void; close: () => void } | null>(null);

function initialDraft(): FixedCostDraft {
  return props.fixedCost ? fixedCostDraftFromRecord(props.fixedCost) : emptyFixedCostDraft();
}

const draft = reactive<FixedCostDraft>(initialDraft());

const cardMode = computed(() => (isCreate.value ? 'create' : isEditing.value ? 'edit' : 'display'));
const hoursRequired = computed(() => fixedCostHoursRequired(draft.base));
const hoursLabel = computed(() => (props.fixedCost ? fixedCostHoursLabel(props.fixedCost) : ''));

const TYPE_OPTIONS: FixedCostType[] = ['PERCENTAGE', 'AMOUNT'];
const BASE_OPTIONS: FixedCostBase[] = ['PER_BATCH', 'PER_UNIT', 'PER_HOUR'];

const LABEL_CLASSES = 'text-subtle-foreground text-[11px] font-bold tracking-[0.16em] uppercase';
const FIELD_CLASSES =
  'border-border bg-background text-foreground focus:ring-accent-500/20 rounded-xl border px-3 py-2 text-sm transition-all focus:ring-2 focus:outline-none';

function resetDraft(): void {
  Object.assign(draft, initialDraft());
  error.value = null;
}

function toggleEdit(): void {
  if (saving.value) return;

  if (isEditing.value) {
    if (isCreate.value) {
      emit('cancel');
      return;
    }
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
    const outcome = await props.save({ ...draft });
    if (!outcome.ok) {
      error.value = outcome.message;
      return;
    }

    if (isCreate.value) {
      emit('saved');
      return;
    }

    isEditing.value = false;
    // El registro actualizado llega por props: se espera el render para
    // resembrar el borrador con los valores canónicos del servidor.
    await nextTick();
    resetDraft();
  } finally {
    saving.value = false;
  }
}

async function onDelete(): Promise<void> {
  const target = props.fixedCost;
  if (removing.value || !target || !props.remove) return;

  removing.value = true;

  try {
    const outcome = await props.remove(target.id);
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
  () => props.fixedCost,
  () => {
    if (!isEditing.value) resetDraft();
  }
);
onMounted(syncDialog);
</script>

<template>
  <Card
    class="flex flex-col"
    data-fixed-cost-card
    :data-fc-mode="cardMode"
    :data-fc-id="fixedCost?.id"
    :data-fc-type="fixedCost?.type"
    :data-fc-base="fixedCost?.base"
    :data-fc-value="fixedCost?.value"
    :data-fc-hours="fixedCost?.hours ?? undefined"
  >
    <form novalidate class="flex flex-col" @submit.prevent="onSubmit">
      <!-- Vista -->
      <div v-if="!isEditing" class="flex flex-wrap items-center gap-3">
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span class="text-foreground font-display text-base font-bold" data-fc-name>
            {{ fixedCost?.name }}
          </span>

          <Badge
            v-if="fixedCost"
            variant="tier"
            size="md"
            :color="FIXED_COST_TYPE_BADGE_COLORS[fixedCost.type]"
            class="tracking-wide uppercase"
            data-fc-type-badge
          >
            {{ FIXED_COST_TYPE_LABELS[fixedCost.type] }}
          </Badge>

          <Badge
            v-if="fixedCost"
            variant="tier"
            size="md"
            :color="FIXED_COST_BASE_BADGE_COLORS[fixedCost.base]"
            class="tracking-wide uppercase"
            data-fc-base-badge
          >
            {{ FIXED_COST_BASE_LABELS[fixedCost.base] }}
          </Badge>

          <span
            v-if="fixedCost"
            class="text-foreground font-mono text-sm font-semibold tabular-nums"
            data-fc-display-value
          >
            {{ fixedCostDisplayValue(fixedCost) }}
          </span>

          <span
            v-if="hoursLabel"
            class="text-muted-foreground text-xs tabular-nums"
            data-fc-hours-label
          >
            {{ hoursLabel }}
          </span>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <Button
            variant="iconAccent"
            icon-only
            icon="pencil"
            aria-label="Editar costo fijo"
            aria-pressed="false"
            title="Editar"
            data-fc-edit
            @click="toggleEdit"
          />
        </div>
      </div>

      <!-- Edición / creación -->
      <div v-else class="space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="flex flex-col gap-1">
            <label :class="LABEL_CLASSES" :for="`fc-name-${fixedCost?.id ?? 'new'}`">
              Nombre
            </label>
            <input
              :id="`fc-name-${fixedCost?.id ?? 'new'}`"
              v-model="draft.name"
              name="name"
              type="text"
              maxlength="120"
              :class="FIELD_CLASSES"
              data-fc-name-input
            />
          </div>

          <div class="flex flex-col gap-1">
            <label :class="LABEL_CLASSES" :for="`fc-type-${fixedCost?.id ?? 'new'}`"> Tipo </label>
            <select
              :id="`fc-type-${fixedCost?.id ?? 'new'}`"
              v-model="draft.type"
              name="type"
              :class="FIELD_CLASSES"
              data-fc-type-select
            >
              <option v-for="type in TYPE_OPTIONS" :key="type" :value="type">
                {{ FIXED_COST_TYPE_LABELS[type] }}
              </option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label :class="LABEL_CLASSES" :for="`fc-base-${fixedCost?.id ?? 'new'}`"> Base </label>
            <select
              :id="`fc-base-${fixedCost?.id ?? 'new'}`"
              v-model="draft.base"
              name="base"
              :class="FIELD_CLASSES"
              data-fc-base-select
            >
              <option v-for="base in BASE_OPTIONS" :key="base" :value="base">
                {{ FIXED_COST_BASE_LABELS[base] }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1">
            <label :class="LABEL_CLASSES" :for="`fc-value-${fixedCost?.id ?? 'new'}`">
              Valor
            </label>
            <input
              :id="`fc-value-${fixedCost?.id ?? 'new'}`"
              v-model="draft.value"
              name="value"
              type="text"
              inputmode="decimal"
              :class="[FIELD_CLASSES, 'font-mono']"
              data-fc-value-input
            />
          </div>

          <div v-if="hoursRequired" class="flex flex-col gap-1" data-fc-hours-field>
            <label :class="LABEL_CLASSES" :for="`fc-hours-${fixedCost?.id ?? 'new'}`">
              Horas
            </label>
            <input
              :id="`fc-hours-${fixedCost?.id ?? 'new'}`"
              v-model="draft.hours"
              name="hours"
              type="text"
              inputmode="decimal"
              :class="[FIELD_CLASSES, 'font-mono']"
              data-fc-hours-input
            />
          </div>

          <div class="hidden sm:block" />
        </div>

        <div
          class="border-border-light flex flex-wrap items-center justify-between gap-3 border-t pt-4"
        >
          <div class="flex items-center gap-2">
            <Button
              v-if="!isCreate"
              variant="danger"
              icon="trash-2"
              :disabled="removing"
              data-fc-delete
              @click="deleteOpen = true"
            >
              Eliminar
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="secondary" :disabled="saving" data-fc-cancel @click="toggleEdit">
              Cancelar
            </Button>
            <Button variant="primary" icon="check" type="submit" :loading="saving" data-fc-save>
              Guardar
            </Button>
          </div>
        </div>
      </div>

      <p v-if="error" class="text-danger mt-2 text-xs font-semibold" role="alert" data-fc-error>
        {{ error }}
      </p>
    </form>

    <Dialog
      :id="`delete-fixed-cost-${fixedCost?.id ?? 'new'}`"
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
          <h2 class="text-foreground text-lg font-bold">Confirmar eliminación</h2>
          <p class="text-muted-foreground mt-2 text-sm">
            ¿Eliminar este costo fijo? Esta acción no se puede deshacer.
          </p>
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" :disabled="removing" @click="deleteOpen = false">
          Cancelar
        </Button>
        <Button
          variant="danger"
          icon="trash-2"
          :loading="removing"
          data-fc-confirm-delete
          @click="onDelete"
        >
          Eliminar
        </Button>
      </div>
    </Dialog>
  </Card>
</template>
