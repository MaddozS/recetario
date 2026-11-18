<script setup lang="ts">
import type { RecipeRecord } from '~/features/recipes/recipe-state';
import RecipeActionsMenu from '~/features/recipes/RecipeActionsMenu.vue';

/**
 * Card del grid de recetas. Paridad con `RecipeGridCard`: enlace al
 * detalle, badge de categoría, conteo de ingredientes y menú de acciones.
 * El grid aporta el índice para el stagger de la animación.
 */
defineProps<{
  recipe: RecipeRecord;
  canDuplicate: boolean;
  index: number;
}>();

const emit = defineEmits<{
  duplicate: [recipe: RecipeRecord];
  delete: [recipe: RecipeRecord];
}>();
</script>

<template>
  <div class="relative" :style="{ '--stagger-index': index }">
    <NuxtLink
      :to="`/recipes/${recipe.id}`"
      class="recipe-grid-card group border-border bg-card hover:border-accent-300 hover:bg-accent-50/30 block rounded-2xl border p-5 shadow-sm hover:shadow-md active:scale-[0.98]"
      style="
        transition:
          transform 160ms var(--ease-out),
          box-shadow 160ms var(--ease-out),
          border-color 160ms var(--ease-out),
          background-color 160ms var(--ease-out);
      "
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3
            class="text-secondary-foreground group-hover:text-accent-700 truncate font-bold transition-colors"
          >
            {{ recipe.name }}
          </h3>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <Badge v-if="recipe.category" variant="category" color="accent">
              {{ recipe.category }}
            </Badge>
            <span class="text-muted-foreground text-xs">
              {{ recipe.ingredientCount }}
              {{ recipe.ingredientCount === 1 ? 'ingrediente' : 'ingredientes' }}
            </span>
          </div>
        </div>
      </div>
    </NuxtLink>

    <RecipeActionsMenu
      :recipe-id="recipe.id"
      :can-duplicate="canDuplicate"
      @duplicate="emit('duplicate', recipe)"
      @delete="emit('delete', recipe)"
    />
  </div>
</template>
