<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'category' | 'tier' | 'outline' | 'status';
type Color = 'accent' | 'success' | 'danger' | 'warning' | 'neutral';
type Size = 'sm' | 'md';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    color?: Color;
    size?: Size;
  }>(),
  { variant: 'category', color: 'accent', size: 'sm' }
);

const BASE_CLASSES = 'inline-flex items-center whitespace-nowrap font-bold';

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-[11px] px-2.5 py-0.5',
};

const COLOR_CLASSES: Record<Color, { bg: string; text: string; border: string }> = {
  accent: {
    // AA: el 700 sobre accent-100 daba 3.8:1 en light (coral) y el tint 900 de
    // dark es demasiado claro para cualquier shade de texto (Task 13a).
    bg: 'bg-accent-100 dark:bg-accent-50',
    text: 'text-accent-800',
    border: 'border-accent-200',
  },
  success: {
    bg: 'bg-success-bg',
    text: 'text-success',
    border: 'border-success-border',
  },
  danger: {
    bg: 'bg-danger-bg',
    text: 'text-danger',
    border: 'border-danger-border',
  },
  warning: {
    bg: 'bg-warning-bg',
    text: 'text-warning',
    border: 'border-warning-border',
  },
  neutral: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
};

const VARIANT_CLASSES: Record<Variant, string> = {
  category: 'rounded-full',
  tier: 'rounded-full',
  outline: 'rounded-lg',
  status: 'rounded-full',
};

const classes = computed(() => {
  const color = COLOR_CLASSES[props.color];
  return [
    BASE_CLASSES,
    SIZE_CLASSES[props.size],
    color.bg,
    color.text,
    color.border,
    VARIANT_CLASSES[props.variant],
  ];
});
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
