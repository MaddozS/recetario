<script setup lang="ts">
import type { RuleResult } from "@recetario/auth/password";

/**
 * Requisitos de contraseña (sign-up y reset). Un solo render para ambos flujos,
 * alimentado por `getRuleResults` de `@recetario/auth/password`.
 */
defineProps<{ results: readonly RuleResult[] }>();
</script>

<template>
  <ul class="mt-2 space-y-1" aria-label="Requisitos de la contraseña">
    <li
      v-for="rule in results"
      :key="rule.key"
      class="flex items-center gap-1.5 text-xs"
      :class="rule.passed ? 'text-success' : 'text-muted-foreground'"
      :data-rule="rule.key"
      :data-passed="rule.passed ? '1' : '0'"
    >
      <span aria-hidden="true">{{ rule.passed ? "✓" : "○" }}</span>
      <span>{{ rule.label }}</span>
    </li>
  </ul>
</template>
