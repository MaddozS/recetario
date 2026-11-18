<script setup lang="ts">
import { computed } from 'vue';
import type { NuxtError } from '#app';
import { NOT_FOUND_SEO } from '#shared/utils/seo';

const props = defineProps<{ error: NuxtError }>();

const isNotFound = computed(() => props.error.statusCode === 404);

// El 404 es SSR con status real y sin canonical indexable.
useSeoMeta({
  title: NOT_FOUND_SEO.title,
  description: NOT_FOUND_SEO.description,
  robots: 'noindex, nofollow',
});
</script>

<template>
  <div class="bg-background flex min-h-dvh flex-col items-center justify-center p-4">
    <div class="mx-auto flex max-w-md flex-col items-center text-center">
      <div
        class="bg-accent-50 text-accent-600 flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <Icon :name="isNotFound ? 'lucide:search-x' : 'lucide:alert-triangle'" :size="24" />
      </div>
      <h1 class="text-foreground mt-5 text-lg font-bold">
        {{ isNotFound ? 'Página no encontrada' : 'Algo salió mal' }}
      </h1>
      <p class="text-muted-foreground mt-2 text-sm">
        {{
          isNotFound
            ? 'La página que buscas no existe o fue movida.'
            : `Error ${error.statusCode}: ${error.message}`
        }}
      </p>
      <Button class="mt-5" icon="arrow-left" @click="clearError({ redirect: '/' })">
        Volver al inicio
      </Button>
    </div>
  </div>
</template>
