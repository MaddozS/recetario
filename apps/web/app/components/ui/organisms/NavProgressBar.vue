<script setup lang="ts">
/**
 * Barra de progreso de navegación. `useLoadingIndicator` se engancha a los
 * hooks `page:loading:start/end` de Nuxt: no hay listeners manuales ni eventos
 * `astro:*` que limpiar.
 */
const { isLoading, progress } = useLoadingIndicator({
  duration: 2000,
  throttle: 150,
  hideDelay: 200,
  resetDelay: 300,
});

const barStyle = computed(() => ({
  width: `${progress.value}%`,
  opacity: isLoading.value ? "1" : "0",
}));
</script>

<template>
  <div
    id="nav-progress-bar"
    class="bg-accent-600 pointer-events-none fixed top-0 right-0 left-0 z-100 h-1 transition-all duration-300"
    :style="barStyle"
    aria-hidden="true"
  />
</template>
