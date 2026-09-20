<script setup lang="ts">
/**
 * Pasos del landing. Los `reveal-item` con `--reveal-delay` se revelan cuando
 * el contenedor de la sección entra en viewport (directiva `v-reveal`).
 */
interface Step {
  number: string;
  title: string;
  description: string;
  stat: string;
}

const STEPS: readonly Step[] = [
  {
    number: "01",
    title: "Registra tus ingredientes",
    description:
      "Carga tus ingredientes con precios de compra, unidades y proveedores. El sistema calcula los costos automáticamente.",
    stat: "Harina: $15.00/kg · Azúcar: $23.56/kg",
  },
  {
    number: "02",
    title: "Crea tus recetas",
    description:
      "Agrega ingredientes con cantidades exactas a cada receta. El costo base se actualiza al instante.",
    stat: "3 ingredientes · $22.40 costo base",
  },
  {
    number: "03",
    title: "Optimiza tus precios",
    description:
      "Visualiza costos, márgenes y precios sugeridos. Ajusta y exporta tu receta al instante.",
    stat: "Precio sugerido: $33.60 con margen 50%",
  },
];
</script>

<template>
  <section
    id="how-it-works"
    v-reveal
    class="bg-muted relative overflow-hidden py-24 md:py-32"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_25%,color-mix(in_oklab,var(--aw-accent-200)_45%,transparent)_0%,transparent_70%)]"
    />

    <div class="relative z-10 mx-auto max-w-7xl px-6">
      <div v-reveal class="mx-auto max-w-2xl text-center">
        <p
          class="text-accent-text mb-3 text-xs font-bold tracking-[0.16em] uppercase"
        >
          Cómo funciona
        </p>
        <h2
          class="landing-heading text-foreground text-3xl font-black md:text-4xl"
        >
          Del ingrediente al precio final
        </h2>
        <p class="text-muted-foreground mt-4 text-lg">
          Tres pasos para tener el control de tus costos.
        </p>
      </div>

      <div class="relative mx-auto mt-16 sm:mt-24">
        <div class="mx-auto max-w-3xl space-y-12 md:space-y-16">
          <div
            v-for="(step, index) in STEPS"
            :key="step.number"
            class="reveal-item"
            :style="`--reveal-delay: ${index * 150}ms`"
          >
            <div class="flex items-start gap-5">
              <div
                class="bg-accent-solid text-text-on-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black"
              >
                {{ step.number }}
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-foreground text-xl font-bold md:text-2xl">
                  {{ step.title }}
                </h3>
                <p
                  class="text-muted-foreground mt-1.5 text-sm leading-relaxed md:text-base"
                >
                  {{ step.description }}
                </p>
                <div
                  class="bg-card border-border mt-4 inline-flex items-center rounded-xl border px-4 py-2.5 text-sm shadow-sm"
                >
                  <span
                    class="text-secondary-foreground font-mono text-xs font-medium tabular-nums"
                  >
                    {{ step.stat }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
