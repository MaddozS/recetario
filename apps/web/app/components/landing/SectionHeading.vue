<script setup lang="ts">
/**
 * Cabecera de las secciones públicas: antetítulo, titular y entradilla.
 *
 * Antes cada sección escribía su propia cabecera a mano (unas con eyebrow, otras
 * sin él, tamaños de titular distintos entre landing, `/pricing` y las legales),
 * que es de donde venía la sensación de que cada bloque era de un sitio
 * distinto. Un solo componente, una sola jerarquía.
 *
 * No confundir con el átomo del kit (`~/components/ui/atoms/SectionHeading.vue`,
 * `<SectionHeading>`): ese lleva icono y va dentro de la app privada.
 */
type Align = "center" | "start";
type Level = "h1" | "h2";

const props = withDefaults(
  defineProps<{
    eyebrow?: string;
    title: string;
    description?: string;
    align?: Align;
    level?: Level;
  }>(),
  {
    eyebrow: undefined,
    description: undefined,
    align: "center",
    level: "h2",
  },
);

const ALIGN: Record<Align, string> = {
  center: "mx-auto max-w-2xl text-center",
  start: "max-w-2xl",
};

const TITLE_SIZE: Record<Level, string> = {
  h1: "text-4xl md:text-5xl",
  h2: "text-3xl md:text-4xl",
};
</script>

<template>
  <div :class="ALIGN[props.align]">
    <p
      v-if="props.eyebrow"
      class="text-accent-text mb-3 text-xs font-bold tracking-[0.16em] uppercase"
    >
      {{ props.eyebrow }}
    </p>
    <component
      :is="props.level"
      class="landing-heading text-foreground font-display leading-[1.1] font-black"
      :class="TITLE_SIZE[props.level]"
    >
      {{ props.title }}
    </component>
    <p
      v-if="props.description"
      class="text-secondary-foreground mt-4 text-lg leading-relaxed"
    >
      {{ props.description }}
    </p>
  </div>
</template>
