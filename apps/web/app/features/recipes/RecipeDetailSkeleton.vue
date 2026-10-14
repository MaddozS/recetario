<script setup lang="ts">
/**
 * Esqueleto del detalle de receta: se pinta mientras el detalle viaja (la
 * página lo resuelve con `lazy`, así que la navegación cliente no espera).
 */
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-2">
        <Skeleton class="h-4 w-20" />
        <Skeleton class="h-8 w-64" />
        <Skeleton class="h-4 w-36" />
      </div>
      <div class="flex items-center gap-2">
        <Skeleton class="h-11 w-24" />
        <Skeleton class="h-11 w-11" />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <Skeleton v-for="index in 4" :key="`summary-${index}`" class="h-20" />
    </div>

    <Card padding="lg" class="space-y-4">
      <div class="border-border flex items-center justify-between border-b pb-4">
        <Skeleton class="h-6 w-32" />
        <Skeleton class="h-11 w-24" />
      </div>
      <div class="space-y-3 pt-2">
        <Skeleton v-for="index in 3" :key="`row-${index}`" class="h-12 rounded-xl" />
      </div>
    </Card>
  </div>
</template>
