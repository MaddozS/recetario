<script setup lang="ts">
import type { RecipeRecord } from "~/features/recipes/recipe-state";
import RecipeGridCard from "~/features/recipes/RecipeGridCard.vue";

/**
 * Grid del listado. Sustituye al parche de Astro que ocultaba/mostraba cards e
 * inyectaba el bloque de "sin resultados" con `innerHTML`: aquí el estado
 * filtrado ya viene resuelto y el bloque es declarativo.
 */
defineProps<{
  recipes: RecipeRecord[];
  canDuplicate: boolean;
}>();

const emit = defineEmits<{
  duplicate: [recipe: RecipeRecord];
  delete: [recipe: RecipeRecord];
}>();
</script>

<template>
  <div class="mt-4">
    <div
      v-if="recipes.length > 0"
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <RecipeGridCard
        v-for="(recipe, index) in recipes"
        :key="recipe.id"
        :recipe="recipe"
        :can-duplicate="canDuplicate"
        :index="index"
        @duplicate="emit('duplicate', recipe)"
        @delete="emit('delete', recipe)"
      />
    </div>

    <Card v-else padding="lg" class="p-8! text-center shadow-sm">
      <p class="text-muted-foreground text-sm">No se encontraron recetas</p>
    </Card>
  </div>
</template>
