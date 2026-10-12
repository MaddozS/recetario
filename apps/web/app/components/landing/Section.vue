<script setup lang="ts">
/**
 * Shell de las secciones públicas (landing, `/funciones`, planes y legales).
 *
 * Existe porque no había ninguna: cada sección repetía sus utilidades de
 * contenedor (`mx-auto max-w-7xl px-6 py-24 md:py-32`) y por eso el ritmo
 * vertical y los anchos derivaban de una sección a otra. Aquí viven el ancho,
 * el tono de fondo y el ritmo; lo que cambia de una sección a otra (su
 * composición) se queda en cada consumidor.
 *
 * El `id` es el ancla del navbar y del scroll-spy: `scroll-mt-16` la deja libre
 * de la barra fija.
 */
type Tone = "background" | "muted" | "card";
type Width = "wide" | "narrow";
type Spacing = "normal" | "tight";

const props = withDefaults(
  defineProps<{
    id?: string;
    tone?: Tone;
    width?: Width;
    spacing?: Spacing;
  }>(),
  {
    id: undefined,
    tone: "background",
    width: "wide",
    spacing: "normal",
  },
);

const TONE: Record<Tone, string> = {
  background: "bg-background",
  muted: "bg-muted",
  card: "bg-card",
};

const WIDTH: Record<Width, string> = {
  wide: "max-w-7xl px-4 sm:px-6 xl:px-8",
  narrow: "max-w-3xl px-4 sm:px-6",
};

const SPACING: Record<Spacing, string> = {
  // El padding superior limpia la barra fija (64px) también cuando la sección es
  // lo primero de una página (`/funciones`, `/pricing`, las legales): con 80px
  // el titular quedaba a 16px del borde de la barra.
  normal: "pt-24 pb-20 md:pt-28 md:pb-28",
  tight: "pt-20 pb-16 md:pt-24 md:pb-20",
};
</script>

<template>
  <section :id="props.id" class="scroll-mt-16" :class="TONE[props.tone]">
    <div class="mx-auto" :class="[WIDTH[props.width], SPACING[props.spacing]]">
      <slot />
    </div>
  </section>
</template>
