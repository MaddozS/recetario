<script setup lang="ts">
/**
 * Hero del landing. La columna visual es una captura real del producto
 * (`public/hero_light.webp`, recorte 2x de la vista de receta con datos del
 * seed) en una ventana con marco.
 *
 * Ya no alterna captura por tema: el marketing es claro (`app.vue` fuerza el
 * tema en las rutas públicas), así que mantener el par light/dark sólo dejaba un
 * asset sin usar y una rama muerta.
 *
 * Los números de la tarjeta de la cuenta son los del producto y suman:
 * con un margen del 40% el precio es `costo / (1 - 0.4)`
 * (`computeSuggestedBatchPrice`), es decir `$2.40 → $4.00`, y la ganancia
 * (`+$1.60`) es exactamente lo que se le suma al costo.
 */
const HERO_SHOT = "/hero_light.webp";

/** Cada renglón declara el valor que anima `LandingCountUp`. */
const HERO_ROWS = [
  {
    label: "Costo de la mezcla",
    value: 2.4,
    prefix: "$",
    lead: "Insumos de un lote",
  },
  {
    label: "Margen 40%",
    value: 1.6,
    prefix: "+$",
    lead: "Lo que ganas",
  },
] as const;

const HERO_PRICE = { value: 4, prefix: "$", decimals: 2 };
</script>

<template>
  <section
    v-reveal
    data-landing-hero
    class="bg-background border-b border-border-light"
  >
    <div
      class="mx-auto w-full max-w-7xl px-4 pt-28 pb-16 sm:px-6 sm:pt-32 sm:pb-20 xl:px-8"
    >
      <div
        class="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-16 lg:gap-y-12 xl:gap-x-20"
      >
        <div class="lg:max-w-2xl">
          <p
            class="text-accent-text reveal-item font-mono text-[11px] font-bold tracking-[0.18em] uppercase"
            style="--reveal-delay: 0ms"
          >
            Costeo de recetas para negocios de comida
          </p>
          <h1
            class="landing-heading text-foreground reveal-item mt-4 font-display leading-[1.05] font-black tracking-[-0.03em]"
            style="--reveal-delay: 60ms; font-size: clamp(2.4rem, 6.4vw, 4.75rem)"
          >
            Calcula el costo real
            <span class="text-accent-text"> de tus recetas</span>
          </h1>
          <p
            class="text-secondary-foreground reveal-item mt-5 max-w-lg text-lg leading-relaxed"
            style="--reveal-delay: 120ms"
          >
            Ingredientes, recetas, producción y precios en el mismo lugar. Con el
            costo a la vista, el precio deja de ser una corazonada.
          </p>
          <div
            class="reveal-item mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6"
            style="--reveal-delay: 180ms"
          >
            <Button variant="primary" icon="arrow-right" href="/sign-in">
              Comenzar gratis
            </Button>
            <a
              href="#features"
              class="text-secondary-foreground hover:text-foreground focus-ring text-sm font-bold underline decoration-border decoration-2 underline-offset-4 transition-colors"
            >
              Ver las funciones
            </a>
          </div>
        </div>

        <div class="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div
            v-reveal="'scale'"
            class="relative mx-auto w-full max-w-xl lg:w-[26rem] lg:max-w-none xl:w-[29rem]"
            style="transition-delay: 150ms"
          >
            <img
              :src="HERO_SHOT"
              alt="Receta de ejemplo en KitchCalc con el costo de los insumos, los costos fijos, el costo total de la receta y el margen deseado"
              width="1682"
              height="1378"
              class="border-border block h-auto w-full rounded-2xl border shadow-2xl"
            />
          </div>
        </div>

        <div class="lg:col-start-1 lg:row-start-2">
          <div
            class="reveal-item flex justify-start"
            style="--reveal-delay: 260ms"
          >
            <div
              class="bg-card border-border min-w-60 rounded-2xl border p-5 shadow-sm"
            >
              <p class="section-label">La cuenta de un lote</p>
              <div class="mt-3 space-y-2.5">
                <div
                  v-for="row in HERO_ROWS"
                  :key="row.label"
                  class="flex items-baseline justify-between gap-6"
                >
                  <span class="text-muted-foreground text-sm">
                    {{ row.label }}
                  </span>
                  <LandingCountUp
                    :value="row.value"
                    :prefix="row.prefix"
                    class="text-foreground font-mono text-base font-bold tabular-nums"
                  />
                </div>
                <div aria-hidden="true" class="divider my-3" />
                <div class="flex items-baseline justify-between gap-6">
                  <span class="text-foreground text-sm font-bold">
                    Precio de venta
                  </span>
                  <LandingCountUp
                    :value="HERO_PRICE.value"
                    :prefix="HERO_PRICE.prefix"
                    :decimals="HERO_PRICE.decimals"
                    class="text-accent-text font-mono text-lg font-black tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>

          <p
            class="text-muted-foreground reveal-item mt-5 text-sm"
            style="--reveal-delay: 320ms"
          >
            Sin tarjeta de crédito. El plan gratis no caduca.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
