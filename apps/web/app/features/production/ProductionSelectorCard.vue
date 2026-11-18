<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { ProductionRecipeGroup } from './production-catalog';
import ProductionRecipeRow from './ProductionRecipeRow.vue';
import type { ProductionCatalogRecipe, ProductionSelection } from './production-types';

/**
 * Selector de recetas: contador, «Seleccionar todas» con indeterminado,
 * búsqueda accent-insensitive (las seleccionadas nunca se ocultan), grupos por
 * categoría, tope del plan Basic y CTA de cálculo.
 */
const props = defineProps<{
  total: number;
  selectedCount: number;
  selectedIds: ReadonlySet<number>;
  selectionById: ReadonlyMap<number, ProductionSelection>;
  groups: ProductionRecipeGroup[];
  visibleCount: number;
  presentations: ReadonlyMap<number, { id: number; name: string }[]>;
  isPro: boolean;
  maxRecipes: number;
  atLimit: boolean;
}>();

const emit = defineEmits<{
  toggle: [recipeId: number];
  toggleAll: [checked: boolean];
  'update:batches': [recipeId: number, value: string];
  stepBatches: [recipeId: number, direction: 1 | -1];
  'update:presentation': [recipeId: number, presentationId: number];
  calculate: [];
}>();

const search = defineModel<string>('search', { required: true });

const SEARCH_INPUT_CLASSES =
  'bg-background border-border focus:ring-accent-500/20 focus:border-accent-500 placeholder:text-subtle-foreground w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm transition-colors focus:outline-none focus:ring-2';

const allSelected = computed(() => props.total > 0 && props.selectedCount === props.total);
const someSelected = computed(() => props.selectedCount > 0 && props.selectedCount < props.total);

/** El baseline deshabilita «Seleccionar todas» si Basic no alcanza para el total. */
const selectAllDisabled = computed(() => !props.isPro && props.total > props.maxRecipes);

const selectAllEl = ref<HTMLInputElement | null>(null);

function syncIndeterminate(): void {
  if (selectAllEl.value) {
    selectAllEl.value.indeterminate = someSelected.value;
  }
}

watch([allSelected, someSelected], syncIndeterminate, { flush: 'post' });
onMounted(syncIndeterminate);

function presentationsFor(recipe: ProductionCatalogRecipe) {
  return props.presentations.get(recipe.id) ?? [];
}

function isRecipeDisabled(recipe: ProductionCatalogRecipe): boolean {
  return props.atLimit && !props.selectedIds.has(recipe.id);
}
</script>

<template>
  <Card class="production-selector flex flex-col" padding="lg">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 class="text-foreground text-lg font-bold">Seleccionar recetas</h2>
        <p class="text-muted-foreground mt-0.5 text-sm">
          Marca las recetas y ajusta las mezclas para tu producción.
        </p>
      </div>
      <span
        class="border-border bg-background text-secondary-foreground rounded-full border px-3 py-1 text-xs font-semibold tabular-nums"
      >
        <span data-selected-count>{{ selectedCount }}</span>
        <span class="text-muted-foreground"> / {{ total }} seleccionadas</span>
      </span>
    </div>

    <label
      v-if="total > 1"
      class="text-muted-foreground mb-4 flex cursor-pointer items-center gap-2 text-sm font-semibold select-none"
    >
      <input
        ref="selectAllEl"
        data-select-all
        type="checkbox"
        :checked="allSelected"
        :disabled="selectAllDisabled"
        class="border-border text-accent-600 focus:ring-accent-500 h-5 w-5 shrink-0 rounded disabled:opacity-30"
        @change="emit('toggleAll', ($event.target as HTMLInputElement).checked)"
      />
      Seleccionar todas
    </label>

    <template v-if="total > 0">
      <div class="relative mb-4">
        <Icon
          name="lucide:search"
          :size="16"
          class="text-subtle-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <label for="recipe-search" class="sr-only">Buscar receta</label>
        <input
          id="recipe-search"
          v-model="search"
          type="search"
          placeholder="Buscar por nombre..."
          autocomplete="off"
          :class="SEARCH_INPUT_CLASSES"
        />
      </div>

      <div
        v-if="visibleCount === 0"
        data-search-empty
        class="text-muted-foreground bg-muted/40 border-border mb-4 rounded-xl border px-4 py-3 text-sm"
      >
        No se encontraron recetas.
      </div>
    </template>

    <EmptyState
      v-if="total === 0"
      icon="lucide:book-x"
      title="No hay recetas"
      description="Crea una receta primero."
      action-label="Ir a recetas"
      action-href="/recipes"
    />

    <form v-else class="flex flex-col gap-4 md:min-h-0 md:flex-1" @submit.prevent>
      <div
        id="recipe-groups"
        class="max-h-105 space-y-4 overflow-y-auto overscroll-contain px-1 pb-2 md:max-h-none md:min-h-0 md:flex-1"
      >
        <div
          v-if="!isPro && atLimit"
          data-upgrade-banner
          class="border-warning-border bg-warning-bg rounded-xl border p-4"
        >
          <p class="text-warning text-sm font-semibold">
            Límite de {{ maxRecipes }} recetas alcanzado en plan Basic.
          </p>
          <NuxtLink to="/pricing" class="text-accent-800 text-sm font-bold">
            Actualizar a Pro para planificar recetas ilimitadas →
          </NuxtLink>
        </div>

        <fieldset v-for="group in groups" :key="group.label ?? '__all__'">
          <legend
            v-if="group.label"
            class="text-muted-foreground mb-2 px-1 text-[11px] font-bold tracking-[0.18em] uppercase"
          >
            {{ group.label }}
          </legend>
          <div class="space-y-2">
            <ProductionRecipeRow
              v-for="recipe in group.recipes"
              :key="recipe.id"
              :recipe="recipe"
              :selection="selectionById.get(recipe.id)"
              :presentations="presentationsFor(recipe)"
              :disabled="isRecipeDisabled(recipe)"
              @toggle="emit('toggle', recipe.id)"
              @step-batches="(direction) => emit('stepBatches', recipe.id, direction)"
              @update:batches="(value) => emit('update:batches', recipe.id, value)"
              @update:presentation="
                (presentationId) => emit('update:presentation', recipe.id, presentationId)
              "
            />
          </div>
        </fieldset>
      </div>

      <div
        class="border-border flex flex-col-reverse items-stretch gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-muted-foreground shrink-0 text-sm">
          Los costos y los insumos se recalculan al instante.
        </p>
        <Button
          data-calculate
          type="button"
          variant="primary"
          icon="calculator"
          class="w-full sm:w-auto"
          :disabled="selectedCount === 0"
          @click="emit('calculate')"
        >
          Calcular producción
        </Button>
      </div>
    </form>
  </Card>
</template>
