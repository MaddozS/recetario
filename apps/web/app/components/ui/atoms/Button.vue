<script setup lang="ts">
import { computed, watch } from 'vue';
import { isInternalHref } from '#shared/utils/navigation';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'iconAccent' | 'iconDanger';
type Size = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    iconOnly?: boolean;
    href?: string;
    icon?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    loading?: boolean;
    id?: string;
    ariaLabel?: string;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    iconOnly: false,
    type: 'button',
    disabled: false,
    loading: false,
  }
);

defineOptions({ inheritAttrs: false });

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 font-bold transition-colors focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer';

const VARIANT_CLASSES: Record<Variant, { solid: string; iconOnly: string }> = {
  primary: {
    // El relleno sale del rol sólido del acento (mismo tono en claro y oscuro
    // en las familias con paridad) y encima va `text-on-accent`, que cada
    // familia fija para sostener AA.
    solid: 'bg-accent-solid text-text-on-accent hover:bg-accent-solid-hover rounded-xl shadow-sm',
    iconOnly: 'bg-accent-solid text-text-on-accent hover:bg-accent-solid-hover rounded-full',
  },
  secondary: {
    solid: 'border border-border bg-card text-muted-foreground hover:bg-background rounded-xl',
    iconOnly: 'border border-border bg-card text-muted-foreground hover:bg-background rounded-full',
  },
  danger: {
    solid: 'bg-danger-solid text-white hover:bg-danger-hover rounded-xl',
    iconOnly: 'bg-danger-solid text-white hover:bg-danger-hover rounded-full',
  },
  ghost: {
    solid: 'text-muted-foreground hover:bg-muted hover:text-secondary-foreground rounded-xl',
    iconOnly: 'text-muted-foreground hover:bg-muted hover:text-secondary-foreground rounded-full',
  },
  iconAccent: {
    solid: 'text-muted-foreground hover:bg-muted rounded-xl',
    iconOnly: 'text-muted-foreground hover:text-accent-600 hover:bg-accent-50 rounded-full',
  },
  iconDanger: {
    solid: 'text-muted-foreground hover:bg-muted rounded-xl',
    iconOnly: 'text-danger hover:bg-danger-bg rounded-full',
  },
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'min-h-10 px-4 py-2 text-xs',
  md: 'min-h-11 px-5 py-3 text-sm',
  lg: 'min-h-12 px-6 py-3.5 text-sm',
};

// `iconAccent`/`iconDanger` sólo tienen sentido sin etiqueta; si se usan mal,
// cae a `ghost` (paridad con el componente el baseline).
const misusedIconVariant = computed(
  () => (props.variant === 'iconAccent' || props.variant === 'iconDanger') && !props.iconOnly
);

const resolvedVariant = computed<Variant>(() =>
  misusedIconVariant.value ? 'ghost' : props.variant
);

if (import.meta.dev) {
  watch(
    misusedIconVariant,
    (misused) => {
      if (misused) {
        console.warn(`Button: variant "${props.variant}" requiere iconOnly=true. Se usa "ghost".`);
      }
    },
    { immediate: true }
  );
}

const classes = computed(() => [
  BASE_CLASSES,
  VARIANT_CLASSES[resolvedVariant.value][props.iconOnly ? 'iconOnly' : 'solid'],
  props.iconOnly ? 'min-h-10 min-w-10 p-2' : SIZE_CLASSES[props.size],
]);

const iconSize = computed(() =>
  props.iconOnly ? 14 : props.size === 'sm' ? 14 : props.size === 'lg' ? 18 : 16
);
</script>

<template>
  <NuxtLink
    v-if="href && isInternalHref(href)"
    :id="id"
    :to="href"
    :aria-label="ariaLabel"
    :class="classes"
    v-bind="$attrs"
  >
    <Icon v-if="icon" :name="`lucide:${icon}`" :size="iconSize" />
    <slot v-if="!iconOnly" />
  </NuxtLink>
  <a
    v-else-if="href"
    :id="id"
    :href="href"
    :aria-label="ariaLabel"
    :class="classes"
    v-bind="$attrs"
  >
    <Icon v-if="icon" :name="`lucide:${icon}`" :size="iconSize" />
    <slot v-if="!iconOnly" />
  </a>
  <button
    v-else
    :id="id"
    :type="type"
    :aria-label="ariaLabel"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
    :class="classes"
    v-bind="$attrs"
  >
    <svg
      v-if="loading"
      class="h-4 w-4 animate-[sp_0.7s_linear_infinite]"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
    <Icon v-else-if="icon" :name="`lucide:${icon}`" :size="iconSize" />
    <slot v-if="!iconOnly" />
  </button>
</template>
