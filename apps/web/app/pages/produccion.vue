<script setup lang="ts">
import ProductionResults from '~/features/production/ProductionResults.vue';
import ProductionSelectorCard from '~/features/production/ProductionSelectorCard.vue';
import ProductionSkeleton from '~/features/production/ProductionSkeleton.vue';
import { useProductionPlanner } from '~/features/production/useProductionPlanner';

definePageMeta({
  layout: 'private',
  middleware: 'auth',
  breadcrumbs: [{ label: 'Planificador de Producción' }],
});

useHead({ title: 'Planificador de producción | KitchCalc' });

const {
  canAccess,
  gated,
  loadFailed,
  loading,
  refresh,
  catalog,
  selectedIds,
  selectionById,
  selections,
  groups,
  visibleCount,
  searchQuery,
  presentationOptions,
  isPro,
  maxRecipes,
  atLimit,
  results,
  resultsPending,
  detailsError,
  retryDetails,
  selectionLabel,
  stage,
  showResults,
  editSelection,
  toggle,
  toggleAll,
  updateBatches,
  stepBatchesFor,
  updatePresentation,
} = useProductionPlanner();
</script>

<template>
  <div
    class="animate-fade-in mx-auto max-w-5xl space-y-6 pb-12 md:h-full md:pb-0"
    :data-stage="stage"
  >
    <UpgradePrompt
      v-if="!canAccess || gated"
      tier="basic"
      feature="Planificador de producción"
      description="Planifica hasta 3 recetas simultáneas y obtén costos consolidados, insumos totales y hoja de producción imprimible."
      class="mx-auto mt-10 max-w-lg"
    />

    <ProductionSkeleton v-else-if="loading" />

    <Card v-else-if="loadFailed" padding="lg">
      <FeedbackAlert type="error" message="No se pudo cargar el planificador de producción." />
      <Button variant="secondary" icon="refresh-cw" class="mt-4" @click="refresh()">
        Reintentar
      </Button>
    </Card>

    <template v-else>
      <!--
        En escritorio la selección ocupa la pantalla: la columna mide el alto
        de `main` y la card se queda con todo el sobrante bajo el título. En
        móvil la columna mide su contenido (el documento sigue desplazando) y
        la lista conserva su tope propio.
      -->
      <div v-if="stage === 'select'" class="flex flex-col gap-6 md:h-full">
        <SectionHeading
          icon="factory"
          title="Planificador de Producción"
          subtitle="Elige las recetas, define cuántas mezclas de cada una y obtén al instante los insumos y costos de tu producción."
          level="h1"
        />

        <ProductionSelectorCard
          v-model:search="searchQuery"
          class="md:min-h-0 md:flex-1"
          :total="catalog.length"
          :selected-count="selections.length"
          :selected-ids="selectedIds"
          :selection-by-id="selectionById"
          :groups="groups"
          :visible-count="visibleCount"
          :presentations="presentationOptions"
          :is-pro="isPro"
          :max-recipes="maxRecipes"
          :at-limit="atLimit"
          @toggle="toggle"
          @toggle-all="toggleAll"
          @update:batches="updateBatches"
          @step-batches="stepBatchesFor"
          @update:presentation="updatePresentation"
          @calculate="showResults"
        />
      </div>

      <ProductionResults
        v-else
        :summary="results.summary"
        :ingredients="results.consolidatedIngredients"
        :selection-label="selectionLabel"
        :pending="resultsPending"
        :failed="detailsError"
        @edit="editSelection"
        @retry="retryDetails"
      />
    </template>
  </div>
</template>
