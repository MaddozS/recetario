<script setup lang="ts">
import { computed } from 'vue';
import type { FinancialEditField } from './recipe-detail-form';
import type { FinancialRow } from './recipe-financials';

/**
 * Resumen financiero del detalle y del planificador.
 *
 * La card cuenta la historia en dos tramos rotulados: el costo de la mezcla
 * (partes y total) y el precio de venta (el margen como control y su
 * consecuencia). Las respuestas —precio sugerido y ganancia— van en la banda
 * teñida con el acento, el mismo tratamiento de las píldoras de métricas del
 * sistema; el costo se queda en tinta neutra, porque un número en rojo se lee
 * como pérdida.
 *
 * En modo edición algunas filas cambian el valor por un input: `fields` dice
 * cuáles y qué campo del formulario editan; el valor viaja como `v-model` desde
 * el padre, así que ya no hace falta el atributo `form=` del baseline.
 */
const props = withDefaults(
  defineProps<{
    rows: ReadonlyArray<FinancialRow>;
    /** Título del encabezado; sin él la card no dibuja encabezado ni chip. */
    title?: string;
    /** Alcance de las cifras (p. ej. «1 mezcla»), como chip a la derecha. */
    scope?: string;
    fields?: ReadonlyArray<FinancialEditField>;
    editable?: boolean;
    desiredMargin?: string;
    fixedCostsPercentage?: string;
  }>(),
  {
    editable: false,
    fields: () => [],
    desiredMargin: '',
    fixedCostsPercentage: '',
  }
);

const emit = defineEmits<{
  'update:desiredMargin': [value: string];
  'update:fixedCostsPercentage': [value: string];
}>();

type IndexedRow = { row: FinancialRow; index: number };
type RowGroup = {
  label?: string;
  /** Palanca del tramo: va en el encabezado, junto al rótulo. */
  control?: IndexedRow;
  /** Filas del tramo (partes y total). */
  rows: IndexedRow[];
  /** Respuestas del tramo: van juntas en la banda de acento. */
  answers: IndexedRow[];
};

/** Agrupa por tramo conservando el índice real de cada fila (edición y énfasis). */
const groups = computed<RowGroup[]>(() => {
  const result: RowGroup[] = [];

  props.rows.forEach((row, index) => {
    let current = result[result.length - 1];
    if (!current || current.label !== row.group) {
      current = { label: row.group, rows: [], answers: [] };
      result.push(current);
    }

    if (row.emphasis === 'control') {
      current.control = { row, index };
      return;
    }
    (row.emphasis === 'answer' ? current.answers : current.rows).push({
      row,
      index,
    });
  });

  return result;
});

function fieldFor(rowIndex: number): FinancialEditField | undefined {
  return props.fields.find((field) => field.rowIndex === rowIndex);
}

function fieldValue(name: FinancialEditField['name']): string {
  return name === 'desiredMargin' ? props.desiredMargin : props.fixedCostsPercentage;
}

function onInput(name: FinancialEditField['name'], event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  if (name === 'desiredMargin') {
    emit('update:desiredMargin', value);
    return;
  }
  emit('update:fixedCostsPercentage', value);
}
</script>

<template>
  <Card padding="lg">
    <div
      v-if="title || scope"
      class="border-border-light flex flex-wrap items-center justify-between gap-3 border-b pb-4"
    >
      <h2
        v-if="title"
        class="text-foreground font-display flex items-center gap-2 text-base font-bold"
      >
        <Icon name="lucide:calculator" :size="18" class="text-accent-600" />
        {{ title }}
      </h2>
      <Badge v-if="scope" variant="outline" color="neutral">
        {{ scope }}
      </Badge>
    </div>

    <div class="space-y-4" :class="title || scope ? 'mt-4' : ''">
      <template v-for="(group, groupIndex) in groups" :key="groupIndex">
        <div
          v-if="group.label || group.control"
          class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
          :class="groupIndex > 0 ? 'border-border-light border-t pt-4' : ''"
        >
          <p v-if="group.label" class="section-label">{{ group.label }}</p>

          <div v-if="group.control" class="flex items-baseline gap-2">
            <label
              v-if="editable && fieldFor(group.control.index)"
              :for="`fs-edit-${fieldFor(group.control.index)!.name}`"
              class="text-muted-foreground text-xs font-semibold"
            >
              {{ group.control.row.label }}
            </label>
            <span v-else class="text-muted-foreground text-xs font-semibold">
              {{ group.control.row.label }}
            </span>
            <input
              v-if="editable && fieldFor(group.control.index)"
              :id="`fs-edit-${fieldFor(group.control.index)!.name}`"
              type="number"
              :value="fieldValue(fieldFor(group.control.index)!.name)"
              class="bg-background border-border text-foreground focus:ring-accent-500/20 w-14 rounded-lg border p-1 font-mono text-sm font-semibold focus:ring-2"
              @input="onInput(fieldFor(group.control.index)!.name, $event)"
            />
            <span v-else class="text-foreground font-mono text-sm font-semibold">
              {{ group.control.row.value }}
            </span>
            <span
              v-if="editable && fieldFor(group.control.index)?.suffix"
              class="text-subtle-foreground text-xs font-bold"
            >
              {{ fieldFor(group.control.index)!.suffix }}
            </span>
          </div>
        </div>

        <div
          v-if="group.rows.length"
          class="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]"
        >
          <div
            v-for="item in group.rows"
            :key="item.row.label"
            :data-financial-row="item.row.label"
            class="flex min-w-0 flex-col justify-between"
          >
            <p
              class="mb-1.5 text-[10px] font-black tracking-wider uppercase"
              :class="item.row.emphasis === 'total' ? 'text-foreground' : 'text-subtle-foreground'"
            >
              <span v-if="item.row.op" class="mr-1 font-mono">{{ item.row.op }}</span>
              {{ item.row.label }}
            </p>
            <div>
              <div v-if="editable && fieldFor(item.index)" class="flex items-baseline gap-1">
                <label :for="`fs-edit-${fieldFor(item.index)!.name}`" class="sr-only">
                  {{ item.row.label }}
                </label>
                <input
                  :id="`fs-edit-${fieldFor(item.index)!.name}`"
                  type="number"
                  :value="fieldValue(fieldFor(item.index)!.name)"
                  class="bg-background border-border text-foreground focus:ring-accent-500/20 w-16 rounded-xl border p-1 font-mono text-xl font-semibold focus:ring-2 2xl:text-2xl"
                  @input="onInput(fieldFor(item.index)!.name, $event)"
                />
                <span
                  v-if="fieldFor(item.index)!.suffix"
                  class="text-subtle-foreground text-lg font-bold"
                >
                  {{ fieldFor(item.index)!.suffix }}
                </span>
              </div>
              <p
                v-else
                data-financial-value
                class="text-foreground truncate font-mono leading-none tabular-nums"
                :class="
                  item.row.emphasis === 'total'
                    ? 'text-2xl font-bold 2xl:text-3xl'
                    : 'text-xl font-semibold 2xl:text-2xl'
                "
                :title="item.row.value"
              >
                {{ item.row.value }}
              </p>
              <p
                v-if="item.row.subtitle"
                class="text-subtle-foreground mt-1.5 line-clamp-1 text-[11px] font-semibold"
              >
                {{ item.row.subtitle }}
              </p>
              <p
                v-if="item.row.secondaryValue"
                data-financial-secondary
                class="text-subtle-foreground mt-0.5 font-mono text-[11px] font-semibold"
              >
                {{ item.row.secondaryValue }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="group.answers.length"
          class="border-accent-200 bg-accent-50 grid grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]"
        >
          <div
            v-for="item in group.answers"
            :key="item.row.label"
            :data-financial-answer="item.row.label"
            class="flex min-w-0 flex-col"
          >
            <p class="text-accent-800 mb-1.5 text-[10px] font-black tracking-wider uppercase">
              {{ item.row.label }}
            </p>
            <p
              data-financial-value
              class="text-accent-800 truncate font-mono text-2xl leading-none font-bold tabular-nums"
              :title="item.row.value"
            >
              {{ item.row.value }}
            </p>
            <p
              v-if="item.row.subtitle"
              class="text-accent-800 mt-1.5 line-clamp-1 text-[11px] font-semibold"
            >
              {{ item.row.subtitle }}
            </p>
            <p
              v-if="item.row.secondaryValue"
              data-financial-secondary
              class="text-accent-800 mt-0.5 font-mono text-[11px] font-semibold"
            >
              {{ item.row.secondaryValue }}
            </p>
          </div>
        </div>
      </template>
    </div>
  </Card>
</template>
