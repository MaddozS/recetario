<script setup lang="ts">
/**
 * Pills de métricas del recetario. Paridad con `RecipeStats`: la pill de
 * categorías sólo aparece si hay categorías y la de ingredientes si hay
 * ingredientes usados en recetas.
 */
defineProps<{
  recipeCount: number;
  categoryCount: number;
  ingredientCount: number;
}>();

const STAT_CLASSES =
  "recipe-stat border-accent-200 bg-accent-50 text-accent-800 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold";
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div :class="STAT_CLASSES">
      <Icon name="lucide:book-open" :size="14" />
      {{ recipeCount }} {{ recipeCount === 1 ? "Receta" : "Recetas" }}
    </div>

    <div v-if="categoryCount > 0" :class="STAT_CLASSES">
      <Icon name="lucide:folders" :size="14" />
      {{ categoryCount }} {{ categoryCount === 1 ? "Categoría" : "Categorías" }}
    </div>

    <div v-if="ingredientCount > 0" :class="STAT_CLASSES">
      <Icon name="lucide:package" :size="14" />
      {{ ingredientCount }}
      {{ ingredientCount === 1 ? "Ingrediente" : "Ingredientes" }}
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  @keyframes statFadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .recipe-stat {
    animation: statFadeIn 0.2s var(--ease-out) both;
  }
  .recipe-stat:nth-child(1) {
    animation-delay: 0ms;
  }
  .recipe-stat:nth-child(2) {
    animation-delay: 60ms;
  }
  .recipe-stat:nth-child(3) {
    animation-delay: 120ms;
  }
}
</style>
