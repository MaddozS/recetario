<script setup lang="ts">
import { computed } from 'vue';
import type { PricingPlan } from '@recetario/types';
import type { BillingInterval } from './billing-interval';

/**
 * Bloque de precio mensual/anual. Los valores vienen pre-formateados del API
 * (`monthlyDisplay`, `yearlyDisplay`, `yearlyPerMonthDisplay`); el plan free no
 * tiene precios.
 */
const props = defineProps<{
  plan: PricingPlan;
  interval: BillingInterval;
}>();

const isFree = computed(() => props.plan.id === 'free');
</script>

<template>
  <div>
    <template v-if="interval === 'monthly'">
      <p v-if="isFree" class="text-foreground text-2xl font-black md:text-3xl">Gratis</p>
      <template v-else>
        <p class="text-foreground text-2xl font-black whitespace-nowrap md:text-3xl">
          {{ plan.currency }} {{ plan.monthlyDisplay }}
          <span class="text-subtle-foreground text-base font-semibold"> /mes </span>
        </p>
        <p class="text-subtle-foreground mt-0.5 text-xs">Facturado mensualmente</p>
      </template>
    </template>

    <template v-else>
      <p v-if="isFree" class="text-foreground text-2xl font-black md:text-3xl">Gratis</p>
      <template v-else>
        <p class="text-foreground text-2xl font-black whitespace-nowrap md:text-3xl">
          {{ plan.currency }} {{ plan.yearlyPerMonthDisplay }}
          <span class="text-subtle-foreground text-base font-semibold"> /mes </span>
        </p>
        <p class="text-subtle-foreground mt-0.5 text-xs">
          {{ plan.currency }} {{ plan.yearlyDisplay }} facturados anualmente
        </p>
      </template>
    </template>
  </div>
</template>
