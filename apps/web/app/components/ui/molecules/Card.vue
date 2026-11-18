<script setup lang="ts">
import { computed } from 'vue';

type Padding = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    padding?: Padding;
    hover?: boolean;
    accent?: boolean;
  }>(),
  { padding: 'md', hover: false, accent: false }
);

const PADDING_CLASSES: Record<Padding, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const classes = computed(() => [
  'bg-card rounded-2xl border shadow-sm',
  PADDING_CLASSES[props.padding],
  props.hover ? 'hover:border-accent-300 hover:shadow-md transition-all' : '',
  props.accent ? 'border-accent-100' : 'border-border',
]);
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
