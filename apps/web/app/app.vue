<script setup lang="ts">
const { theme, accent, isDark, accentCssVars } = useTheme();

// Único dueño de los atributos de `<html>`: preferencia (`data-theme`),
// acento (`data-accent`), clase `dark` y las variables CSS del acento. El
// script anti-FOUC sólo resuelve la clase antes del primer paint.
useHead({
  htmlAttrs: {
    "data-theme": theme,
    "data-accent": accent,
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
