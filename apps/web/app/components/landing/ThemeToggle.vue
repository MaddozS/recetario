<script setup lang="ts">
import { THEME_COOKIE } from "#shared/utils/preferences";
import { writeDocumentCookie } from "~/utils/cookies";

/**
 * Toggle de tema del landing: usa el mecanismo unificado (`useTheme`) y
 * persiste en la cookie de presentación que el SSR ya lee cookie-first. Sin
 * `localStorage` ni `window.toggleLandingTheme` (los del `LandingLayout` de
 * Astro).
 */
const { isDark, setTheme } = useTheme();

function toggleTheme(): void {
  const next = isDark.value ? "light" : "dark";
  setTheme(next);
  writeDocumentCookie(THEME_COOKIE, next);
}
</script>

<template>
  <button
    type="button"
    class="text-muted-foreground hover:text-foreground hover:bg-hover-muted inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors"
    aria-label="Cambiar tema"
    data-theme-toggle
    @click="toggleTheme"
  >
    <Icon :name="isDark ? 'lucide:moon' : 'lucide:sun'" :size="18" />
  </button>
</template>
