<script setup lang="ts">
/**
 * El problema. Plantea los tres dolores clave de los emprendedores de alimentos
 * antes de presentar las funciones de la aplicación.
 */
const PROBLEMS = [
  {
    icon: 'lucide:trending-up',
    title: 'El insumo sube, el precio no',
    tag: 'Inflación silenciosa',
    description:
      'Cuando la harina o la mantequilla suben de precio, sigues cobrando lo mismo y la diferencia sale directo de tu ganancia.',
  },
  {
    icon: 'lucide:table',
    title: 'Recetas en hojas de cálculo',
    tag: 'Trabajo manual',
    description:
      'Cada cambio de proveedor obliga a recalcular ingrediente por ingrediente. Siempre se queda una receta desactualizada.',
  },
  {
    icon: 'lucide:circle-help',
    title: 'Precios fijados por intuición',
    tag: 'Margen incierto',
    description:
      'Sin costos fijos ni porcentaje de ganancia claros, terminas cobrando lo mismo que la competencia sin saber si realmente te alcanza.',
  },
] as const;
</script>

<template>
  <LandingSection id="problem" tone="warm" decor="glow-corner">
    <div id="problema" class="scroll-mt-16">
      <div
        class="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14"
      >
        <div>
          <LandingSectionHeading
            align="start"
            eyebrow="El problema"
            title="El precio lo pones a ojo"
            description="Sin saber con exactitud tus costos reales por lote, vender más no siempre significa ganar más."
          />
          <div class="mt-6 hidden lg:block">
            <p class="text-secondary-foreground text-sm leading-relaxed">
              KitchCalc automatiza esta matemática para que cada nuevo precio de compra actualice
              tus recetas al instante.
            </p>
          </div>
        </div>

        <div class="grid gap-4 sm:gap-5">
          <div
            v-for="problem in PROBLEMS"
            :key="problem.title"
            class="bg-card border-border hover:border-accent-300 rounded-2xl border p-5 shadow-xs transition-colors sm:p-6"
          >
            <div class="flex items-start gap-4">
              <span
                class="bg-accent-50 text-accent-text flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              >
                <Icon :name="problem.icon" :size="20" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-foreground text-base font-bold sm:text-lg">
                    {{ problem.title }}
                  </h3>
                  <span
                    class="text-accent-text bg-accent-50 hidden rounded-md px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider uppercase sm:inline-block"
                  >
                    {{ problem.tag }}
                  </span>
                </div>
                <p class="text-secondary-foreground mt-1.5 text-sm leading-relaxed">
                  {{ problem.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </LandingSection>
</template>
