<script setup lang="ts">
/**
 * Toggle de tema del landing: usa el mecanismo unificado (`useTheme`) y, si hay
 * sesión, persiste con `PUT /api/preferences` (la cookie se escribe desde la
 * respuesta confirmada). Anónimo: la cookie es el único almacén. Sin
 * `localStorage`, sin `window.toggleLandingTheme` y sin escrituras optimistas.
 */
const { isDark, accent } = useTheme();
const { saveAppearance } = useAppearancePersistence();

function toggleTheme(): void {
  const next = isDark.value ? "light" : "dark";
  void saveAppearance({ theme: next, accentColor: accent.value });
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
