<script setup lang="ts">
import { computed } from 'vue';

/**
 * Shell de una card de plan: el mismo objeto en `/` y en `/pricing`.
 *
 * El sustrato (borde, fondo, radio, padding) vive aquí porque es la firma del
 * plan, no de la superficie: cuando estaba duplicado, la card del landing medía
 * `border-width: 0px` y la de `/pricing` `1px solid`. Lo que sí depende de la
 * superficie se queda en cada consumidor: el layout del scroller/grid, el hover
 * (`pricing-card-hover*`), el foco y los estados deshabilitados.
 *
 * `featured` es el plan recomendado (borde y halo de acento, tinte en oscuro) y
 * `highlighted` el destino de `?plan=<tier>` de `UpgradePrompt`, que manda sobre
 * el anterior mientras dura el resaltado.
 */
type Density = 'compact' | 'roomy';
type Variant = 'plain' | 'featured' | 'highlighted';

const props = withDefaults(
  defineProps<{
    planId?: string;
    featured?: boolean;
    highlighted?: boolean;
    density?: Density;
  }>(),
  {
    planId: undefined,
    featured: false,
    highlighted: false,
    density: 'compact',
  }
);

const DENSITY_CLASSES: Record<Density, string> = {
  compact: 'p-6',
  roomy: 'p-7 md:p-8 xl:p-10',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  plain: 'border-border',
  featured: 'border-accent-300 plan-pro dark:bg-accent-800/10 z-10',
  highlighted: 'border-accent-500 ring-2 ring-accent-500 ring-offset-2 ring-offset-background',
};

const variant = computed<Variant>(() => {
  if (props.highlighted) return 'highlighted';
  return props.featured ? 'featured' : 'plain';
});

const classes = computed(() => [
  'bg-card relative flex flex-col rounded-2xl border shadow-sm',
  DENSITY_CLASSES[props.density],
  VARIANT_CLASSES[variant.value],
]);
</script>

<template>
  <div :data-plan="planId" :data-highlighted="highlighted ? '1' : undefined" :class="classes">
    <slot />
  </div>
</template>
