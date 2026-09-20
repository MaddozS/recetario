<script setup lang="ts">
/**
 * Hero del landing. Los números de la tarjeta de costos se animan con
 * `LandingCountUp` (rAF con cleanup) en lugar del `data-count-up` con
 * IntersectionObserver del original.
 */
</script>

<template>
  <section
    v-reveal
    data-landing-hero
    class="hero-bg relative grid min-h-[calc(100dvh-1px)] overflow-hidden sm:min-h-dvh"
  >
    <div
      aria-hidden="true"
      class="hero-pattern pointer-events-none absolute inset-0"
    />
    <div
      class="relative z-10 mx-auto w-full max-w-7xl place-self-center px-6 py-16 sm:py-20 md:py-24 lg:py-28 xl:py-32 2xl:py-36"
    >
      <div
        class="grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16 xl:gap-20 2xl:gap-24"
      >
        <div class="text-center lg:text-left">
          <h1
            class="landing-heading text-foreground reveal-item leading-[1.05] font-black tracking-[-0.03em] sm:leading-[0.95]"
            style="--reveal-delay: 0ms; font-size: clamp(2.5rem, 7vw, 5.5rem)"
          >
            Calcula el costo real
            <span class="text-accent-text"> de tus recetas</span>
          </h1>
          <p
            class="text-secondary-foreground landing-heading reveal-item mx-auto mt-5 max-w-lg text-lg leading-relaxed sm:text-xl md:mt-6 lg:mx-0"
            style="--reveal-delay: 100ms"
          >
            KitchCalc te ayuda a calcular costos, márgenes y precios de venta.
            Gestiona ingredientes, stock y producción en un solo lugar.
          </p>
          <div
            class="reveal-item mt-8 flex flex-col items-center gap-4 sm:mt-10 sm:flex-row sm:justify-center sm:gap-5 lg:justify-start"
            style="--reveal-delay: 200ms"
          >
            <Button
              variant="primary"
              icon="arrow-up-circle"
              href="/sign-in"
              class="shadow-accent-tint hover:shadow-xl active:scale-[0.97]"
            >
              Comenzar gratis
            </Button>
            <a
              href="#features"
              class="text-muted-foreground hover:text-foreground focus-ring relative inline-flex min-h-11 items-center gap-1.5 rounded text-sm font-semibold transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100"
            >
              Conocer más
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </a>
          </div>

          <div
            class="reveal-item mt-10 flex justify-center lg:justify-start"
            style="--reveal-delay: 350ms"
          >
            <div
              class="bg-card border-border min-w-60 rounded-2xl border p-5 shadow-sm sm:p-6"
            >
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span
                    class="text-muted-foreground text-xs font-semibold tracking-widest uppercase"
                  >
                    Costo base
                  </span>
                  <LandingCountUp
                    :value="2.4"
                    class="text-foreground font-mono text-base font-bold tabular-nums"
                  />
                </div>
                <div class="flex items-center justify-between">
                  <span
                    class="text-accent-800 text-xs font-semibold tracking-widest uppercase"
                  >
                    Margen 50%
                  </span>
                  <LandingCountUp
                    :value="1.2"
                    prefix="+$"
                    class="text-accent-800 font-mono text-base font-bold tabular-nums"
                  />
                </div>
                <div
                  aria-hidden="true"
                  class="border-border my-2 border-t border-dashed"
                />
                <div class="flex items-center justify-between">
                  <span
                    class="text-success text-xs font-semibold tracking-widest uppercase"
                  >
                    Precio venta
                  </span>
                  <LandingCountUp
                    :value="3.6"
                    class="text-success font-mono text-lg font-black tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>

          <p
            class="text-muted-foreground reveal-item mt-6 text-sm"
            style="--reveal-delay: 400ms"
          >
            Sin tarjeta de crédito. Prueba gratis.
          </p>
        </div>

        <div class="hidden items-center justify-end lg:flex">
          <div
            v-reveal="'scale'"
            class="relative"
            style="transition-delay: 150ms"
          >
            <div
              class="shadow-accent-tint bg-accent-500/35 absolute -inset-10 rounded-[3rem] blur-3xl"
            />
            <img
              src="/kitchcalc_logo.svg"
              alt="KitchCalc"
              class="relative h-72 w-72 drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
