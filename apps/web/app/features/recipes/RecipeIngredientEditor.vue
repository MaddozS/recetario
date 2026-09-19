<script setup lang="ts">
import {
  formatIngredientLabel,
  getUnitOptionsForValue,
} from "./recipe-detail-form";
import type { IngredientRecord, IngredientRow } from "./recipe-detail-form";
import IngredientPicker from "./IngredientPicker.vue";

/**
 * Editor de la lista de ingredientes: una fila por ingrediente, con picker
 * buscable, cantidad, unidad, notas y eliminar; más «Añadir Ingrediente».
 *
 * Las mutaciones llegan como function props del coordinador (mismo patrón que
 * los dialogs del slice), así que las filas son estado del formulario, no DOM
 * clonado.
 */
const props = withDefaults(
  defineProps<{
    rows: ReadonlyArray<IngredientRow>;
    ingredients: ReadonlyArray<IngredientRecord>;
    unitOptions: ReadonlyArray<string>;
    /** Filas señaladas tras un intento de guardado inválido. */
    invalidKeys?: ReadonlyArray<string>;
    addRow: () => void;
    removeRow: (index: number) => void;
    patchRow: (
      index: number,
      patch: Partial<Omit<IngredientRow, "key">>,
    ) => void;
  }>(),
  { invalidKeys: () => [] },
);

const ROW_CLASSES =
  "edit-ingredient-row grid grid-cols-1 gap-3 rounded-2xl border p-3 md:grid-cols-[minmax(0,2.4fr)_minmax(0,13rem)_minmax(0,1fr)_3rem] md:items-center md:rounded-none md:border-0 md:border-b md:border-border-light md:bg-card md:p-0 md:pb-3";

const LABEL_CLASSES =
  "text-[10px] uppercase font-bold text-subtle-foreground md:sr-only";

const FIELD_CLASSES =
  "w-full bg-card border border-border rounded-xl p-2 focus:ring-2 focus:ring-accent-500/20";

const REMOVE_CLASSES =
  "remove-ingredient-btn inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-bg hover:text-danger";

const INVALID_CLASSES =
  "border-danger bg-danger-bg/40 md:border-b md:border-danger";

function onPick(index: number, ingredient: IngredientRecord): void {
  props.patchRow(index, {
    ingredientId: ingredient.id,
    label: formatIngredientLabel(ingredient),
    unit: ingredient.unit,
  });
}

function onClear(index: number): void {
  props.patchRow(index, { ingredientId: null, label: "" });
}

function onQuantity(index: number, event: Event): void {
  props.patchRow(index, {
    quantity: (event.target as HTMLInputElement).value,
  });
}

function onUnit(index: number, event: Event): void {
  props.patchRow(index, { unit: (event.target as HTMLSelectElement).value });
}

function onComment(index: number, event: Event): void {
  props.patchRow(index, { comment: (event.target as HTMLInputElement).value });
}
</script>

<template>
  <div data-edit-ingredients>
    <div
      class="text-subtle-foreground hidden text-[10px] font-bold uppercase md:grid md:grid-cols-[minmax(0,2.4fr)_11rem_minmax(0,1fr)_3rem] md:gap-4 md:px-1 md:pb-3"
    >
      <span>Ingrediente</span>
      <span class="text-center">Cantidad</span>
      <span>Notas</span>
      <span class="sr-only">Acciones</span>
    </div>

    <div class="space-y-3">
      <div
        v-for="(row, index) in rows"
        :key="row.key"
        :class="[
          ROW_CLASSES,
          invalidKeys.includes(row.key)
            ? INVALID_CLASSES
            : 'border-border bg-background/50',
        ]"
        :data-invalid="invalidKeys.includes(row.key) ? 'true' : undefined"
      >
        <div class="min-w-0 space-y-1">
          <label :class="LABEL_CLASSES">Ingrediente</label>
          <IngredientPicker
            :ingredients="ingredients"
            :label="row.label"
            @pick="onPick(index, $event)"
            @clear="onClear(index)"
          />
        </div>

        <div class="min-w-0 space-y-1">
          <label :class="LABEL_CLASSES">Cantidad</label>
          <div
            class="grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2"
          >
            <input
              type="number"
              step="0.01"
              name="quantity"
              :class="[
                FIELD_CLASSES,
                'quantity-input text-secondary-foreground min-w-0 text-center font-mono font-semibold',
              ]"
              :value="row.quantity"
              @input="onQuantity(index, $event)"
            />
            <select
              name="unit"
              :class="[
                FIELD_CLASSES,
                'unit-select text-muted-foreground min-w-0 text-sm',
              ]"
              :value="row.unit"
              @change="onUnit(index, $event)"
            >
              <option
                v-for="unit in getUnitOptionsForValue(unitOptions, row.unit)"
                :key="`${row.key}-${unit.value}`"
                :value="unit.value"
              >
                {{ unit.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="min-w-0 space-y-1">
          <label :class="LABEL_CLASSES">Notas</label>
          <input
            type="text"
            name="comment"
            :class="[
              FIELD_CLASSES,
              'comment-input text-muted-foreground text-sm',
            ]"
            :value="row.comment"
            placeholder="Opcional"
            @input="onComment(index, $event)"
          />
        </div>

        <div class="flex items-center justify-end md:justify-center">
          <button
            type="button"
            :class="REMOVE_CLASSES"
            aria-label="Eliminar ingrediente"
            @click="removeRow(index)"
          >
            <Icon name="lucide:trash-2" :size="18" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex justify-center pt-4">
      <Button
        id="add-ingredient-btn"
        variant="secondary"
        icon="plus"
        size="md"
        class="border-accent-200 text-accent-700 hover:bg-accent-50 shadow-sm"
        @click="addRow()"
      >
        Añadir Ingrediente
      </Button>
    </div>
  </div>
</template>
