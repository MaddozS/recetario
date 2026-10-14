<script setup lang="ts">
import { LANDING_CTAS } from '~/features/landing/landing-ctas';

/**
 * Cierre del landing: un relleno plano del acento y llamada clara a la acción.
 * Usa tokens semánticos sobre la superficie de acento para garantizar contraste.
 */
withDefaults(
  defineProps<{
    secondaryHref?: string;
  }>(),
  { secondaryHref: '#pricing' }
);

const SECONDARY_CLASS =
  'text-text-on-accent focus-visible:ring-text-on-accent inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-on-accent-border px-5 py-3 text-sm font-bold transition-colors hover:bg-on-accent-surface/10 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]';
</script>

<template>
  <section id="cta" class="bg-accent-solid relative isolate scroll-mt-16 overflow-hidden">
    <div aria-hidden="true" class="landing-cta-decor pointer-events-none absolute inset-0 -z-10" />
    <div class="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 md:py-28">
      <h2
        class="landing-heading text-text-on-accent font-display text-3xl leading-[1.1] font-black md:text-4xl"
      >
        Ponle precio a tu próxima receta
      </h2>
      <p class="text-text-on-accent mt-4 text-base font-medium sm:text-lg">
        En tu primera receta ves el costo real, tu margen y cuánto cobrar.
      </p>
      <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <NuxtLink
          :to="LANDING_CTAS.signUp"
          class="text-accent-solid focus-visible:ring-text-on-accent focus-visible:ring-offset-accent-solid bg-on-accent-surface hover:bg-on-accent-surface/90 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          <Icon name="lucide:arrow-right" :size="16" />
          Crear cuenta gratis
        </NuxtLink>
        <NuxtLink v-if="secondaryHref.startsWith('/')" :to="secondaryHref" :class="SECONDARY_CLASS">
          Ver planes
        </NuxtLink>
        <a v-else :href="secondaryHref" :class="SECONDARY_CLASS"> Ver planes </a>
      </div>
      <p class="text-text-on-accent/80 mt-4 text-xs font-medium">
        Sin tarjeta de crédito · 10 recetas gratis para siempre
      </p>
    </div>
  </section>
</template>
