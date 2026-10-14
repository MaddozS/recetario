<script setup lang="ts">
import { timeAgo } from '@recetario/stripe/formatters';
import type { RecipeRecord } from '~/features/recipes/recipe-state';

/**
 * Rail de recetas recientemente actualizadas. Paridad con `RecipeMiniCard` +
 * el bloque "Recientemente actualizadas" del baseline: scroll horizontal con cards
 * de ancho fijo (misma información en móvil y escritorio).
 */
defineProps<{ recipes: RecipeRecord[] }>();
</script>

<template>
  <div>
    <h2 class="text-muted-foreground mb-3 text-sm font-bold tracking-[0.12em] uppercase">
      Recientemente actualizadas
    </h2>
    <div class="flex gap-3 overflow-x-auto pb-3">
      <NuxtLink
        v-for="(recipe, index) in recipes"
        :key="recipe.id"
        :to="`/recipes/${recipe.id}`"
        :style="{ '--stagger-index': index }"
        class="recipe-mini-card group border-border bg-card hover:border-accent-300 block w-48 flex-none rounded-xl border p-3 shadow-sm transition-all hover:shadow-md"
      >
        <p
          class="text-secondary-foreground group-hover:text-accent-700 truncate text-sm font-bold transition-colors"
        >
          {{ recipe.name }}
        </p>
        <div class="mt-1.5 flex items-center gap-2">
          <span
            v-if="recipe.category"
            class="bg-accent-50 text-accent-800 border-accent-200 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
          >
            {{ recipe.category }}
          </span>
          <span v-if="recipe.updatedAt" class="text-subtle-foreground text-[10px]">
            {{ timeAgo(recipe.updatedAt) }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  @keyframes miniCardFadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .recipe-mini-card {
    animation: miniCardFadeIn 0.2s var(--ease-out) both;
    animation-delay: calc(var(--stagger-index, 0) * 50ms);
  }
}
</style>
