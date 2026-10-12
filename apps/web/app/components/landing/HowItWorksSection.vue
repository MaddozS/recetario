<script setup lang="ts">
/**
 * Cómo funciona: los tres pasos a la izquierda y, al lado, la cuenta que
 * producen, con la aritmética declarada (`+`, `=`).
 *
 * Antes eran tres pasos con un chip decorativo cada uno, y los números no
 * cuadraban entre sí (`Harina: $15.00/kg` con un `$22.40` de costo base de tres
 * ingredientes). Ahora la cuenta es la del producto y se puede verificar:
 *
 *   Insumos         1.000 kg × $15.00 + 0.250 kg × $24.00 + 0.125 kg × $96.00 = $33.00
 *   + Operativos    10% del costo directo                                     =  $3.30
 *   = Costo total                                                              $36.30
 *   Precio de venta = costo / (1 - 0.40) = 36.30 / 0.6                         $60.50
 *   Ganancia        = 60.50 - 36.30                                            $24.20
 *
 * La última línea usa la misma fórmula que `computeSuggestedBatchPrice`.
 */
interface CostRow {
  label: string;
  note: string;
  value: string;
  op?: "+" | "=";
  total?: boolean;
}

const STEPS = [
  {
    number: "01",
    title: "Registra tus ingredientes",
    description:
      "Cargas cómo compras cada insumo y a qué precio. KitchCalc calcula el costo por unidad de receta, con la conversión incluida.",
    detail: "Harina $15.00/kg · Azúcar $24.00/kg · Mantequilla $96.00/kg",
  },
  {
    number: "02",
    title: "Arma la receta",
    description:
      "Agregas ingredientes con su cantidad exacta. El costo de la mezcla se actualiza en el momento, sin recalcular a mano.",
    detail: "3 ingredientes · $33.00 de insumos por lote",
  },
  {
    number: "03",
    title: "Ajusta el margen y cobra",
    description:
      "Mueves el margen y ves el precio de venta y la ganancia al instante. El mismo número que usarás para la carta.",
    detail: "Margen 40% → $60.50 de precio sugerido",
  },
] as const;

const COST_ROWS: readonly CostRow[] = [
  {
    label: "Insumos",
    note: "Harina, azúcar y mantequilla",
    value: "$33.00",
  },
  {
    label: "Gastos operativos",
    note: "10% del costo directo",
    value: "$3.30",
    op: "+",
  },
  {
    label: "Costo total",
    note: "Lo que cuesta producir",
    value: "$36.30",
    op: "=",
    total: true,
  },
];

const PRICE_ROWS = [
  { label: "Precio de venta", note: "Con 40% de margen", value: "$60.50" },
  { label: "Ganancia", note: "Después de costos", value: "$24.20" },
] as const;
</script>

<template>
  <LandingSection id="how-it-works" tone="muted">
    <LandingSectionHeading
      eyebrow="Cómo funciona"
      title="Del ingrediente al precio final"
      description="Tres pasos, una cuenta. Al final tienes el costo, el precio y lo que te queda."
    />

    <div
      v-reveal
      class="mt-14 grid items-start gap-12 lg:grid-cols-2 lg:gap-16"
    >
      <ol class="space-y-8">
        <li v-for="step in STEPS" :key="step.number" class="flex gap-5">
          <span
            class="text-accent-text pt-1 font-mono text-sm font-bold tabular-nums"
          >
            {{ step.number }}
          </span>
          <div class="min-w-0">
            <h3 class="text-foreground text-xl font-bold">{{ step.title }}</h3>
            <p class="text-secondary-foreground mt-1.5 leading-relaxed">
              {{ step.description }}
            </p>
            <p
              class="text-muted-foreground mt-2.5 font-mono text-xs tabular-nums"
            >
              {{ step.detail }}
            </p>
          </div>
        </li>
      </ol>

      <div
        data-cost-receipt
        class="bg-card border-border rounded-2xl border p-6 shadow-sm sm:p-7"
      >
        <p class="section-label">La cuenta de la receta</p>
        <p class="text-muted-foreground mt-1 text-sm">
          Pan de elote · 1 lote
        </p>

        <dl class="mt-5 space-y-3.5">
          <div
            v-for="row in COST_ROWS"
            :key="row.label"
            class="flex items-baseline justify-between gap-6"
          >
            <dt
              class="text-muted-foreground text-sm"
              :class="{ 'text-foreground font-bold': row.total }"
            >
              <span v-if="row.op" aria-hidden="true">{{ row.op }}&nbsp;</span>
              {{ row.label }}
              <span class="text-muted-foreground block text-xs font-normal">
                {{ row.note }}
              </span>
            </dt>
            <dd
              class="text-foreground shrink-0 font-mono tabular-nums"
              :class="row.total ? 'text-lg font-black' : 'text-base font-bold'"
            >
              {{ row.value }}
            </dd>
          </div>
        </dl>

        <dl
          class="bg-accent-50 border-accent-200 mt-5 space-y-3 rounded-xl border p-4"
        >
          <div
            v-for="row in PRICE_ROWS"
            :key="row.label"
            class="flex items-baseline justify-between gap-6"
          >
            <dt class="text-accent-800 text-sm font-bold">
              {{ row.label }}
              <span class="block text-xs font-normal">{{ row.note }}</span>
            </dt>
            <dd
              class="text-accent-800 shrink-0 font-mono text-lg font-black tabular-nums"
            >
              {{ row.value }}
            </dd>
          </div>
        </dl>

        <NuxtLink
          to="/funciones"
          class="focus-ring text-accent-text mt-5 inline-flex min-h-11 items-center gap-1.5 rounded text-sm font-bold"
        >
          Ver cómo se calcula
          <Icon name="lucide:arrow-right" :size="16" />
        </NuxtLink>
      </div>
    </div>
  </LandingSection>
</template>
