<script setup lang="ts">
import { isPublicMarketingPath } from "#shared/utils/seo";
import { getAccentCssVars } from "~/utils/accent-colors";

const route = useRoute();
const { theme, accent, isDark } = useTheme();

// Las rutas públicas de marketing siempre son coral (paridad con el
// `data-accent="coral"` del `LandingLayout` de Astro); el resto usa la
// preferencia del usuario. `<html>` sigue teniendo un único dueño: `app.vue`.
const effectiveAccent = computed(() =>
  isPublicMarketingPath(route.path) ? "coral" : accent.value,
);

const accentCssVars = computed(() =>
  getAccentCssVars(effectiveAccent.value, isDark.value ? "dark" : "light"),
);

useHead({
  htmlAttrs: {
    "data-theme": theme,
    "data-accent": effectiveAccent,
    class: computed(() => (isDark.value ? "dark" : "")),
    style: accentCssVars,
  },
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
