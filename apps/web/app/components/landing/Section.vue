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
 *
 * `decor` pinta una capa decorativa (puntos, retícula o halos del acento) por
 * debajo del contenido (`isolate` + `-z-10`), sin desbordar la sección; los
 * patrones viven en `global.css` (`.landing-decor`). `bordered` marca la costura
 * superior para que el cambio de sección se lea aunque dos tonos sean cercanos.
 */
type Tone = 'background' | 'muted' | 'card' | 'warm' | 'accent';
type Width = 'wide' | 'narrow';
type Spacing = 'normal' | 'tight' | 'compact';
type Decor = 'none' | 'dots' | 'grid' | 'glow' | 'glow-corner';

const props = withDefaults(
  defineProps<{
    id?: string;
    tone?: Tone;
    width?: Width;
    spacing?: Spacing;
    decor?: Decor;
    bordered?: boolean;
  }>(),
  {
    id: undefined,
    tone: 'background',
    width: 'wide',
    spacing: 'normal',
    decor: 'none',
    bordered: false,
  }
);

const TONE: Record<Tone, string> = {
  background: 'bg-background',
  muted: 'bg-muted',
  card: 'bg-card',
  warm: 'bg-surface-warm',
  accent: 'bg-accent-wash',
};

const WIDTH: Record<Width, string> = {
  wide: 'max-w-7xl px-4 sm:px-6 xl:px-8',
  narrow: 'max-w-3xl px-4 sm:px-6',
};

const SPACING: Record<Spacing, string> = {
  // El padding superior limpia la barra fija (64px) también cuando la sección es
  // lo primero de una página (`/funciones`, `/pricing`, las legales), manteniendo
  // ritmo compacto en pantallas de smartphone para evitar scroll vertical excesivo.
  normal: 'pt-16 pb-14 sm:pt-20 sm:pb-16 md:pt-28 md:pb-28',
  tight: 'pt-12 pb-10 sm:pt-16 sm:pb-14 md:pt-24 md:pb-20',
  compact: 'pt-8 pb-8 sm:pt-12 sm:pb-12 md:pt-16 md:pb-16',
};
</script>

<template>
  <section
    :id="props.id"
    class="relative isolate scroll-mt-16"
    :class="[TONE[props.tone], props.bordered && 'border-border border-t']"
  >
    <div
      v-if="props.decor !== 'none'"
      aria-hidden="true"
      class="landing-decor pointer-events-none absolute inset-0 -z-10"
      :data-decor="props.decor"
    />
    <div class="mx-auto" :class="[WIDTH[props.width], SPACING[props.spacing]]">
      <slot />
    </div>
  </section>
</template>
