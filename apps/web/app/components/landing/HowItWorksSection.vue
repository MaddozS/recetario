<script setup lang="ts">
import { computed, ref } from 'vue';
import { LANDING_CTAS } from '~/features/landing/landing-ctas';

/**
 * Cómo funciona: tres pasos claros y una calculadora interactiva que demuestra
 * en vivo el cálculo exacto de costo, margen, ganancia y precio sugerido.
 */
const STEPS = [
  {
    number: '01',
    title: 'Registra tus ingredientes',
    description:
      'Cargas cómo compras cada insumo y su precio. KitchCalc calcula el costo por unidad de receta con conversión automática.',
    detail: 'Harina $15.00/kg · Azúcar $24.00/kg · Mantequilla $96.00/kg',
  },
  {
    number: '02',
    title: 'Arma la receta',
    description:
      'Agregas ingredientes con su cantidad exacta. El costo se actualiza en el momento, sin tener que recalcular nada a mano.',
    detail: '3 ingredientes · $33.00 de insumos por lote',
  },
  {
    number: '03',
    title: 'Ajusta el margen y cobra',
    description:
      'Mueves el margen deseado y ves el precio sugerido y tu ganancia al instante. El mismo número exacto que va a tu menú.',
    detail: 'Margen configurable de 20% a 70%',
  },
] as const;

interface CostRow {
  label: string;
  note: string;
  value: number;
  op?: string;
  total?: boolean;
}

const COST_ROWS: CostRow[] = [
  { label: 'Insumos', note: 'Harina, azúcar y mantequilla', value: 33.0 },
  { label: 'Gastos fijos', note: '10% del costo directo', value: 3.3, op: '+' },
  { label: 'Costo total', note: 'Lo que cuesta producir', value: 36.3, op: '=', total: true },
];

const TOTAL_COST = 36.3;
const margin = ref(40);

const suggestedPrice = computed(() => Number((TOTAL_COST / (1 - margin.value / 100)).toFixed(2)));

const profit = computed(() => Number((suggestedPrice.value - TOTAL_COST).toFixed(2)));
</script>

<template>
  <LandingSection id="how-it-works" tone="muted" decor="dots" bordered>
    <div id="como-funciona" class="scroll-mt-16">
      <LandingSectionHeading
        eyebrow="Cómo funciona"
        title="Del ingrediente al precio final"
        description="Tres pasos, una cuenta transparente. Al final tienes el costo real, el precio y tu ganancia neta."
      />

      <div v-reveal class="mt-12 grid items-start gap-10 sm:mt-14 lg:grid-cols-2 lg:gap-14">
        <ol class="space-y-8">
          <li v-for="step in STEPS" :key="step.number" class="flex gap-4 sm:gap-5">
            <span class="text-accent-text pt-0.5 font-mono text-sm font-bold tabular-nums">
              {{ step.number }}
            </span>
            <div class="min-w-0">
              <h3 class="text-foreground text-lg font-bold sm:text-xl">{{ step.title }}</h3>
              <p class="text-secondary-foreground mt-1.5 text-sm leading-relaxed sm:text-base">
                {{ step.description }}
              </p>
              <p class="text-muted-foreground mt-2 font-mono text-xs tabular-nums">
                {{ step.detail }}
              </p>
            </div>
          </li>
        </ol>

        <div
          data-cost-receipt
          class="bg-card border-border rounded-2xl border p-5 shadow-sm sm:p-7"
        >
          <div class="border-border flex items-center justify-between border-b pb-3">
            <div>
              <p class="section-label">Simulador de receta</p>
              <p class="text-foreground mt-0.5 text-sm font-bold">
                Pan de elote artesanal · 1 lote
              </p>
            </div>
            <span
              class="text-accent-text bg-accent-50 rounded-md px-2 py-0.5 font-mono text-xs font-bold"
            >
              En vivo
            </span>
          </div>

          <dl class="mt-4 space-y-3">
            <div
              v-for="row in COST_ROWS"
              :key="row.label"
              class="flex items-baseline justify-between gap-4"
            >
              <dt
                class="text-muted-foreground text-xs sm:text-sm"
                :class="{ 'text-foreground font-bold': row.total }"
              >
                <span v-if="row.op" aria-hidden="true">{{ row.op }}&nbsp;</span>
                {{ row.label }}
                <span class="text-muted-foreground block text-[11px] font-normal">
                  {{ row.note }}
                </span>
              </dt>
              <dd
                class="text-foreground shrink-0 font-mono tabular-nums"
                :class="
                  row.total ? 'text-base font-black sm:text-lg' : 'text-sm font-bold sm:text-base'
                "
              >
                ${{ row.value.toFixed(2) }}
              </dd>
            </div>
          </dl>

          <!-- Slider de margen interactivo -->
          <div class="border-border mt-5 border-t pt-4">
            <div class="flex items-center justify-between">
              <label
                for="margin-slider"
                class="text-foreground text-xs font-bold tracking-wider uppercase"
              >
                Margen de ganancia
              </label>
              <span class="text-accent-text font-mono text-sm font-black"> {{ margin }}% </span>
            </div>
            <input
              id="margin-slider"
              v-model.number="margin"
              type="range"
              min="20"
              max="70"
              step="5"
              class="accent-accent-solid bg-muted mt-2.5 h-2 w-full cursor-pointer rounded-lg"
              :aria-valuemin="20"
              :aria-valuemax="70"
              :aria-valuenow="margin"
              :aria-valuetext="`${margin}% de margen, precio $${suggestedPrice}`"
            />
            <div class="text-muted-foreground mt-1 flex justify-between font-mono text-[11px]">
              <span>20%</span>
              <span>40%</span>
              <span>70%</span>
            </div>
          </div>

          <dl class="bg-accent-50 border-accent-200 mt-5 space-y-3 rounded-xl border p-4">
            <div class="flex items-baseline justify-between gap-4">
              <dt class="text-accent-800 text-xs font-bold sm:text-sm">
                Precio sugerido
                <span class="block text-[11px] font-normal">Para cobrar en tu menú</span>
              </dt>
              <dd
                class="text-accent-800 shrink-0 font-mono text-lg font-black tabular-nums sm:text-xl"
              >
                ${{ suggestedPrice.toFixed(2) }}
              </dd>
            </div>
            <div
              class="border-accent-200/60 flex items-baseline justify-between gap-4 border-t pt-2"
            >
              <dt class="text-accent-800 text-xs font-bold sm:text-sm">
                Tu ganancia limpia
                <span class="block text-[11px] font-normal">Después de ingredientes y gastos</span>
              </dt>
              <dd
                class="text-success shrink-0 font-mono text-base font-black tabular-nums sm:text-lg"
              >
                +${{ profit.toFixed(2) }}
              </dd>
            </div>
          </dl>

          <div class="mt-5 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              variant="primary"
              :href="LANDING_CTAS.signUp"
              class="w-full flex-1 justify-center text-xs sm:w-auto"
            >
              Calcular con mi receta gratis
            </Button>
            <NuxtLink
              to="/funciones"
              class="focus-ring text-accent-text inline-flex min-h-10 items-center gap-1 text-xs font-bold hover:underline"
            >
              Ver más detalles
              <Icon name="lucide:arrow-right" :size="14" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </LandingSection>
</template>
