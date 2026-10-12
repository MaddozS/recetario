<script setup lang="ts">
import { isCoralAccentPath, isPublicMarketingPath } from "#shared/utils/seo";
import { getAccentCssVars } from "~/utils/accent-colors";

const route = useRoute();
const { theme, accent, isDark } = useTheme();

// Las rutas públicas de marketing y las de auth siempre son coral (paridad con
// el `data-accent="coral"` del `LandingLayout` del baseline); el resto usa la
// preferencia del usuario. `<html>` sigue teniendo un único dueño: `app.vue`.
const effectiveAccent = computed(() =>
  isCoralAccentPath(route.path) ? "coral" : accent.value,
);

// El marketing es claro y punto: no ofrece modo oscuro, así que ignora la
// preferencia guardada en lugar de pintarla a medias (los componentes que
// elegían captura por tema ya no existen). Las de auth no entran aquí: conservan
// su toggle. El script anti-FOUC de `nuxt.config` lee `data-theme`, así que el
// primer paint ya sale claro sin tocar el script.
const forceLight = computed(() => isPublicMarketingPath(route.path));
const effectiveDark = computed(() => !forceLight.value && isDark.value);

const accentCssVars = computed(() =>
  getAccentCssVars(effectiveAccent.value, effectiveDark.value ? "dark" : "light"),
);

useHead({
  htmlAttrs: {
    "data-theme": computed(() => (forceLight.value ? "light" : theme.value)),
    "data-accent": effectiveAccent,
    class: computed(() => (effectiveDark.value ? "dark" : "")),
    style: accentCssVars,
  },
});
</script>

<template>
  <NavProgressBar />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
