<script setup lang="ts">
/**
 * Overlay de proceso (paridad con `showLoadingOverlay` de Astro) para acciones
 * que bloquean la pantalla, como cerrar sesión. Se controla con el estado
 * compartido `loading-overlay`.
 */
const message = useState<string | null>("loading-overlay", () => null);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="message"
      id="loading-overlay"
      class="fixed inset-0 z-9999 flex items-center justify-center backdrop-blur-sm"
      style="background: rgba(0, 0, 0, 0.2)"
      role="status"
      aria-live="polite"
    >
      <div
        class="bg-card flex flex-col items-center gap-3 rounded-2xl px-10 py-8 shadow-2xl"
      >
        <svg
          class="text-accent-600 h-7 w-7 animate-[sp_0.7s_linear_infinite]"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span class="text-foreground text-sm font-semibold">{{ message }}</span>
      </div>
    </div>
  </Teleport>
</template>
