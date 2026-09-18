<script setup lang="ts">
import type { FinancialEditField } from "./recipe-detail-form";
import type { FinancialRow } from "./recipe-financials";

/**
 * Resumen financiero del detalle (paridad con `FinancialSummary.astro`).
 *
 * En modo edición algunas filas cambian el valor por un input: `fields` dice
 * cuáles y qué campo del formulario editan; el valor viaja como `v-model` desde
 * el padre, así que ya no hace falta el atributo `form=` del baseline.
 */
const props = withDefaults(
  defineProps<{
    rows: ReadonlyArray<FinancialRow>;
    /** Título opcional dentro de la card (lo usa el planificador). */
    title?: string;
    highlightRow?: number;
    fields?: ReadonlyArray<FinancialEditField>;
    editable?: boolean;
    desiredMargin?: string;
    fixedCostsPercentage?: string;
  }>(),
  {
    editable: false,
    fields: () => [],
    desiredMargin: "",
    fixedCostsPercentage: "",
  },
);

const emit = defineEmits<{
  "update:desiredMargin": [value: string];
  "update:fixedCostsPercentage": [value: string];
}>();

const COLOR_BORDERS: Record<string, string> = {
  danger: "border-l-danger-solid/60",
  muted: "border-l-muted-foreground/30",
  accent: "border-l-accent-400/60",
  success: "border-l-success-solid/60",
};

function fieldFor(rowIndex: number): FinancialEditField | undefined {
  return props.fields.find((field) => field.rowIndex === rowIndex);
}

function fieldValue(name: FinancialEditField["name"]): string {
  return name === "desiredMargin"
    ? props.desiredMargin
    : props.fixedCostsPercentage;
}

function onInput(name: FinancialEditField["name"], event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  if (name === "desiredMargin") {
    emit("update:desiredMargin", value);
    return;
  }
  emit("update:fixedCostsPercentage", value);
}
</script>

<template>
  <Card padding="lg">
    <h2
      v-if="title"
      class="text-muted-foreground mb-1.5 text-[10px] font-black tracking-wider uppercase"
    >
      {{ title }}
    </h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div
        v-for="(row, index) in rows"
        :key="row.label"
        :data-financial-row="row.label"
        class="flex flex-col justify-between border-l-[3px] py-1 pl-3 sm:px-1 sm:pl-4"
        :class="[
          row.color ? (COLOR_BORDERS[row.color] ?? '') : 'border-l-transparent',
          index > 1 ? 'border-border-light sm:border-t sm:pt-4' : '',
        ]"
      >
        <p
          class="mb-1.5 text-[10px] font-black tracking-wider uppercase"
          :class="
            index === highlightRow
              ? 'text-accent-500'
              : 'text-subtle-foreground'
          "
        >
          {{ row.label }}
        </p>
        <div>
          <div
            v-if="editable && fieldFor(index)"
            class="flex items-baseline gap-1"
          >
            <label :for="`fs-edit-${fieldFor(index)!.name}`" class="sr-only">
              {{ row.label }}
            </label>
            <input
              :id="`fs-edit-${fieldFor(index)!.name}`"
              type="number"
              :value="fieldValue(fieldFor(index)!.name)"
              class="focus:ring-accent-500/20 w-16 rounded-xl border p-1 font-mono text-xl font-semibold focus:ring-2 2xl:text-2xl"
              :class="
                index === highlightRow
                  ? 'border-white/20 bg-white/15 text-white focus:ring-white/30'
                  : 'bg-background border-border text-foreground'
              "
              @input="onInput(fieldFor(index)!.name, $event)"
            />
            <span
              v-if="fieldFor(index)!.suffix"
              class="text-lg font-bold"
              :class="
                index === highlightRow
                  ? 'text-white/80'
                  : 'text-subtle-foreground'
              "
            >
              {{ fieldFor(index)!.suffix }}
            </span>
          </div>
          <p
            v-else
            data-financial-value
            class="truncate font-mono text-2xl leading-none font-semibold tabular-nums 2xl:text-3xl"
            :class="
              index === highlightRow ? 'text-accent-600' : 'text-foreground'
            "
            :title="row.value"
          >
            {{ row.value }}
          </p>
          <p
            v-if="row.subtitle"
            class="mt-1.5 line-clamp-1 text-[11px] font-semibold"
            :class="
              index === highlightRow
                ? 'text-accent-400'
                : 'text-subtle-foreground'
            "
          >
            {{ row.subtitle }}
          </p>
          <p
            v-if="row.secondaryValue && !editable"
            data-financial-secondary
            class="text-subtle-foreground mt-0.5 font-mono text-[11px] font-semibold"
          >
            {{ row.secondaryValue }}
          </p>
        </div>
      </div>
    </div>
  </Card>
</template>
