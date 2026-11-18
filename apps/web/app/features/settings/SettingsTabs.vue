<script setup lang="ts">
import { SETTINGS_TABS, settingsTabHref } from './settings-tabs';
import type { SettingsTab } from './settings-tabs';

/**
 * Navegación de settings: cada pestaña es un enlace con `?tab=` (el router
 * resuelve back/forward y deep links) en lugar del `pushState` + `classList`
 * del baseline. Los iconos se ocultan en móvil, igual que en el baseline.
 */
defineProps<{ active: SettingsTab }>();
</script>

<template>
  <nav class="border-border mb-8 flex gap-0 border-b" aria-label="Configuración">
    <NuxtLink
      v-for="tab in SETTINGS_TABS"
      :key="tab.id"
      :to="settingsTabHref(tab.id)"
      :data-tab="tab.id"
      :data-tab-active="tab.id === active ? '1' : '0'"
      :aria-current="tab.id === active ? 'page' : undefined"
      class="-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors"
      :class="
        tab.id === active
          ? 'border-accent-600 text-accent-700'
          : 'text-muted-foreground hover:text-secondary-foreground hover:border-muted-foreground/30 border-transparent'
      "
    >
      <Icon :name="tab.icon" :size="16" class="hidden sm:block" />
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>
