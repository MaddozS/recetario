<script setup lang="ts">
/**
 * Tarjeta de las cinco páginas de auth (paridad con el markup del baseline): barra
 * de acento superior, cabecera opcional con icono y h1, y slot para el
 * formulario o los estados.
 */
withDefaults(
  defineProps<{
    icon?: string;
    title?: string;
    subtitle?: string;
    centered?: boolean;
  }>(),
  { centered: false },
);
</script>

<template>
  <div
    class="bg-card relative w-full max-w-sm rounded-2xl p-6 pt-8 shadow-lg sm:p-10 sm:pt-12"
    :class="{ 'text-center': centered }"
  >
    <div
      aria-hidden="true"
      class="bg-accent-500 absolute top-0 right-8 left-8 h-1 rounded-full"
    />

    <div v-if="title" class="mb-8 text-center">
      <div
        v-if="icon"
        class="bg-accent-50 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <Icon :name="`lucide:${icon}`" :size="28" class="text-accent-600" />
      </div>
      <h1 class="text-foreground text-2xl font-black">{{ title }}</h1>
      <p v-if="subtitle" class="text-muted-foreground mt-1 text-sm">
        {{ subtitle }}
      </p>
    </div>

    <slot />
  </div>
</template>
