<script setup lang="ts">
import { LANDING_CTAS } from '~/features/landing/landing-ctas';

/**
 * Hero del landing.
 *
 * Muestra la captura real del producto (`public/hero_light.webp`) de la receta
 * "Panqué de plátano". Los números de la tarjeta de la cuenta son exactamente
 * los que aparecen en la captura:
 *
 *   Insumos: $68.34
 *   Gastos fijos: $20.50
 *   Costo total: $88.84
 *   Margen 50%: +$88.84
 *   Precio sugerido: $177.68
 */
const HERO_SHOT = '/hero_light.webp';

interface HeroRow {
  label: string;
  value: number;
  prefix: string;
  success?: boolean;
}

const HERO_ROWS: HeroRow[] = [
  { label: 'Insumos', value: 68.34, prefix: '$' },
  { label: 'Gastos fijos', value: 20.5, prefix: '+$' },
  { label: 'Ganancia (Margen 50%)', value: 88.84, prefix: '+$', success: true },
];

const HERO_PRICE = { value: 177.68, prefix: '$', decimals: 2 };
</script>

<template>
  <section
    v-reveal
    data-landing-hero
    class="bg-background border-border relative isolate overflow-hidden border-b"
  >
    <!-- Fondo: rejilla de puntos desvanecida + halo del acento detrás de la captura -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
      <div class="landing-hero-glow absolute inset-0" />
      <div class="landing-dots absolute inset-0" />
    </div>

    <div
      class="mx-auto w-full max-w-7xl px-4 pt-20 pb-20 sm:px-6 sm:pt-28 sm:pb-28 lg:pb-36 xl:px-8"
    >
      <div
        class="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-12 xl:gap-x-16"
      >
        <div class="lg:max-w-2xl">
          <p
            class="text-accent-text reveal-item font-mono text-[11px] font-bold tracking-[0.18em] uppercase"
            style="--reveal-delay: 0ms"
          >
            Para reposteros, cocinas y negocios de comida
          </p>

          <h1
            class="landing-heading text-foreground reveal-item font-display mt-4 leading-[1.05] font-black tracking-[-0.03em]"
            style="--reveal-delay: 60ms; font-size: clamp(2.3rem, 5.5vw, 4.25rem)"
          >
            ¿Sabes cuánto te deja
            <span class="text-accent-text"> cada receta?</span>
          </h1>

          <p
            class="text-secondary-foreground reveal-item mt-5 max-w-xl text-lg leading-relaxed"
            style="--reveal-delay: 120ms"
          >
            Ingredientes, gastos fijos, margen y precios en el mismo lugar. Sin hojas de cálculo y
            con el costo real de tu negocio a la vista.
          </p>

          <div
            class="reveal-item mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center"
            style="--reveal-delay: 180ms"
          >
            <Button
              variant="primary"
              icon="arrow-right"
              :href="LANDING_CTAS.signUp"
              class="w-full justify-center sm:w-auto"
            >
              Crear cuenta gratis
            </Button>
            <a
              href="#how-it-works"
              class="text-secondary-foreground hover:text-foreground focus-ring decoration-border py-2 text-center text-sm font-bold underline decoration-2 underline-offset-4 transition-colors"
            >
              Ver cómo funciona
            </a>
          </div>

          <p
            class="text-muted-foreground reveal-item mt-4 text-xs font-medium"
            style="--reveal-delay: 240ms"
          >
            Con Google o correo · Sin tarjeta · 10 recetas gratis para siempre
          </p>
        </div>

        <div class="relative lg:col-start-2">
          <!-- La tarjeta se superpone a la esquina inferior izquierda de la captura en
               todos los anchos. Bajo lg el contenedor reserva ese hueco (pl/pb) para
               que la tarjeta sobresalga sin salirse del viewport; en lg vuelve al
               desborde negativo hacia el gap de la rejilla. -->
          <div
            v-reveal="'scale'"
            class="relative mx-auto w-full max-w-xl pb-12 pl-4 sm:pb-14 sm:pl-8 lg:max-w-none lg:p-0"
            style="transition-delay: 150ms"
          >
            <img
              :src="HERO_SHOT"
              alt="Receta de ejemplo en KitchCalc con el costo de los insumos, los costos fijos, el costo total de la receta y el margen deseado"
              width="1682"
              height="1378"
              class="border-border block h-auto w-full rounded-2xl border shadow-xl"
              fetchpriority="high"
            />

            <div
              data-hero-cost-card
              class="bg-card/95 border-border absolute bottom-0 left-0 z-10 w-[min(15.5rem,76%)] rounded-xl border p-3 shadow-xl backdrop-blur-xs sm:w-72 sm:rounded-2xl sm:p-4 lg:-bottom-6 lg:-left-6"
            >
              <div class="border-border flex items-center justify-between border-b pb-2">
                <span
                  class="text-foreground text-[11px] font-bold tracking-wider uppercase sm:text-xs"
                >
                  Panqué de plátano
                </span>
                <span class="text-muted-foreground font-mono text-[11px] sm:text-xs"> 1 lote </span>
              </div>
              <div class="mt-2 space-y-1.5 sm:mt-2.5 sm:space-y-2">
                <div
                  v-for="row in HERO_ROWS"
                  :key="row.label"
                  class="flex items-baseline justify-between gap-3 text-[11px] sm:gap-4 sm:text-xs"
                >
                  <span class="text-muted-foreground">
                    {{ row.label }}
                  </span>
                  <LandingCountUp
                    :value="row.value"
                    :prefix="row.prefix"
                    :decimals="2"
                    class="font-mono font-bold tabular-nums"
                    :class="row.success ? 'text-success' : 'text-foreground'"
                  />
                </div>
                <div aria-hidden="true" class="divider my-1.5 sm:my-2" />
                <div class="flex items-baseline justify-between gap-3 sm:gap-4">
                  <span class="text-foreground text-[11px] font-bold sm:text-xs">
                    Precio sugerido
                  </span>
                  <LandingCountUp
                    :value="HERO_PRICE.value"
                    :prefix="HERO_PRICE.prefix"
                    :decimals="HERO_PRICE.decimals"
                    class="text-accent-text font-mono text-sm font-black tabular-nums sm:text-base"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
