<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    type: "success" | "error";
    message: string;
    recipes?: string[];
  }>(),
  { recipes: () => [] },
);

const classes = computed(() => [
  "mb-4 rounded-2xl border px-4 py-3 text-sm",
  props.type === "success"
    ? "border-success-border bg-success-bg text-success"
    : "border-danger-border bg-danger-bg text-danger",
]);
</script>

<template>
  <div
    aria-atomic="true"
    :aria-live="type === 'success' ? 'polite' : 'assertive'"
    :role="type === 'success' ? 'status' : 'alert'"
    :class="classes"
  >
    <p class="font-semibold">
      {{ message }}
    </p>
    <p v-if="recipes.length > 0" class="mt-2 text-xs">
      Recetas que lo usan: {{ recipes.join(", ") }}
    </p>
  </div>
</template>
