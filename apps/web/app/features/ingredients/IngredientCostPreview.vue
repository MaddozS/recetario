<script setup lang="ts">
import { computed } from "vue";
import {
  formatUnitCost,
  parseIngredientNumber,
} from "~/features/ingredients/ingredient-form";

/**
 * Preview vivo del costo unitario: `price / purchaseQuantity` con la unidad
 * elegida. Sustituye a `updateIngredientForm()` del script de Astro (que
 * mutaba el DOM a mano) por estado reactivo.
 */
const props = defineProps<{
  price: string;
  purchaseQuantity: string;
  unit: string;
}>();

const value = computed(() =>
  formatUnitCost(
    parseIngredientNumber(props.price),
    parseIngredientNumber(props.purchaseQuantity),
  ),
);
</script>

<template>
  <UnitCostDisplay :value="value" :default-unit="unit" />
</template>
