<script setup lang="ts">
import { ref } from "vue";
import PresentationCard from "./PresentationCard.vue";
import PresentationCreateDialog from "./PresentationCreateDialog.vue";
import type {
  PresentationDraft,
  PresentationRecord,
} from "./recipe-presentations";
import type { MutationOutcome } from "./useRecipes";

/**
 * Presentaciones de venta: cabecera con el alta, grid de cards y estado vacío.
 * El CRUD es independiente del modo de edición de la receta (Astro escondía
 * «Nueva Presentación» detrás de `?edit=true`).
 */
defineProps<{
  presentations: ReadonlyArray<PresentationRecord>;
  multiplier: number;
  recipeBatchCost: number;
  suggestedBatchPrice: number;
  createPresentation: (draft: PresentationDraft) => Promise<MutationOutcome>;
  updatePresentation: (
    presentationId: number,
    draft: PresentationDraft,
  ) => Promise<MutationOutcome>;
  deletePresentation: (presentationId: number) => Promise<MutationOutcome>;
}>();

const createOpen = ref(false);
</script>

<template>
  <div data-presentations-panel>
    <div class="flex items-start justify-between gap-3 px-1 py-6">
      <SectionHeading
        icon="tag"
        title="Presentaciones de Venta"
        subtitle="Define cuántas piezas salen por mezcla"
      />
      <Button
        variant="primary"
        icon="plus"
        data-open-presentation
        @click="createOpen = true"
      >
        <span class="sm:hidden">Nueva</span>
        <span class="hidden sm:inline">Nueva Presentación</span>
      </Button>
    </div>

    <div
      v-if="presentations.length === 0"
      class="py-4"
      data-presentations-empty
    >
      <EmptyState
        icon="lucide:tag"
        title="Aún no hay presentaciones de venta"
        description="Define cuántas piezas salen por mezcla para calcular el costo unitario, el precio sugerido y el margen."
      >
        <template #action>
          <Button
            variant="primary"
            icon="plus"
            class="mt-5"
            @click="createOpen = true"
          >
            Crear presentación
          </Button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
      <PresentationCard
        v-for="presentation in presentations"
        :key="presentation.id"
        :presentation="presentation"
        :multiplier="multiplier"
        :recipe-batch-cost="recipeBatchCost"
        :suggested-batch-price="suggestedBatchPrice"
        :save="updatePresentation"
        :remove="deletePresentation"
      />
    </div>

    <PresentationCreateDialog
      v-model:open="createOpen"
      :submit="createPresentation"
    />
  </div>
</template>
