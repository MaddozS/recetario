<script setup lang="ts">
/**
 * Skeleton de refresco (paridad con `IngredientsSkeleton`): card de
 * creación de escritorio + filas de la tabla.
 */
</script>

<template>
  <div class="animate-pulse space-y-6">
    <Card padding="lg" class="hidden h-48 space-y-4 lg:block">
      <Skeleton class="h-6 w-48" />
      <div class="grid grid-cols-5 gap-4 pt-2">
        <Skeleton v-for="field in 5" :key="field" class="h-10" />
      </div>
    </Card>

    <Card class="space-y-4 overflow-hidden p-6">
      <div
        class="border-border flex items-center justify-between border-b pb-4"
      >
        <Skeleton class="h-6 w-40" />
        <Skeleton class="h-10 w-72" />
      </div>
      <div class="space-y-3 pt-2">
        <Skeleton v-for="row in 5" :key="row" class="h-14 w-full" />
      </div>
    </Card>
  </div>
</template>
