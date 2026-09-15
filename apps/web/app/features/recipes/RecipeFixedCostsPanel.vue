<script setup lang="ts">
import { ref } from "vue";
import FixedCostCard from "./FixedCostCard.vue";
import type { FixedCostDraft, FixedCostRecord } from "./recipe-fixed-costs";
import type { MutationOutcome } from "./useRecipes";

/**
 * Costos fijos de la receta: cabecera con el alta y la lista de cards. El alta
 * es una card en modo creación gobernada por `v-if` (Astro la inyectaba con
 * `innerHTML` y borraba el empty state a mano).
 *
 * Los costos fijos no están gateados por plan en Hono: la UI los ofrece siempre
 * y sólo el resumen financiero cambia según `advanced_costs`.
 */
defineProps<{
  recipeFixedCosts: ReadonlyArray<FixedCostRecord>;
  createFixedCost: (draft: FixedCostDraft) => Promise<MutationOutcome>;
  updateFixedCost: (
    fixedCostId: number,
    draft: FixedCostDraft,
  ) => Promise<MutationOutcome>;
  deleteFixedCost: (fixedCostId: number) => Promise<MutationOutcome>;
}>();

const creating = ref(false);
</script>

<template>
  <section class="space-y-4" data-recipe-fixed-costs>
    <div class="flex items-start justify-between gap-3">
      <SectionHeading title="Costos Fijos de la Receta" />
      <Button
        variant="primary"
        icon="plus"
        data-open-fixed-cost
        @click="creating = true"
      >
        Agregar Costo Fijo
      </Button>
    </div>

    <div class="grid grid-cols-1 gap-3">
      <FixedCostCard
        v-for="fixedCost in recipeFixedCosts"
        :key="fixedCost.id"
        :fixed-cost="fixedCost"
        :save="(draft: FixedCostDraft) => updateFixedCost(fixedCost.id, draft)"
        :remove="deleteFixedCost"
      />

      <FixedCostCard
        v-if="creating"
        key="new-fixed-cost"
        mode="create"
        :save="createFixedCost"
        @cancel="creating = false"
        @saved="creating = false"
      />

      <p
        v-if="recipeFixedCosts.length === 0 && !creating"
        class="text-muted-foreground py-8 text-center text-sm"
        data-recipe-fixed-costs-empty
      >
        No hay costos fijos definidos para esta receta.
      </p>
    </div>
  </section>
</template>
