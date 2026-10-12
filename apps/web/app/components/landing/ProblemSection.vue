<script setup lang="ts">
/**
 * El problema. Va antes de las funciones porque el visitante primero tiene que
 * reconocer su situación: sin este bloque, la landing abría con "esto es lo que
 * hace el producto" sin haber dicho por qué le importa a quien llega.
 *
 * Los tres puntos son específicos del negocio (insumo que sube, receta en una
 * hoja de cálculo, precio por intuición), no beneficios genéricos.
 */
const PROBLEMS = [
  {
    title: "El insumo sube, el precio no",
    description:
      "Cuando la harina pasa de $15.00 a $22.00 el kilo, la carta sigue vendiendo al mismo precio y la diferencia la pones tú.",
  },
  {
    title: "La receta vive en una hoja de cálculo",
    description:
      "Cada cambio de precio hay que recalcularlo a mano, receta por receta, y siempre se queda una sin actualizar.",
  },
  {
    title: "No sabes cuánto ganas por lote",
    description:
      "Sin los costos fijos ni el margen a la vista, el precio se decide por intuición y se compite por precio.",
  },
] as const;
</script>

<template>
  <LandingSection id="problem" tone="muted">
    <div
      class="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16"
    >
      <LandingSectionHeading
        align="start"
        eyebrow="El problema"
        title="El precio lo pones a ojo"
        description="Y después no hay forma de saber si el número alcanzaba."
      />

      <ul class="divide-border divide-y">
        <li
          v-for="problem in PROBLEMS"
          :key="problem.title"
          class="py-5 first:pt-0 last:pb-0"
        >
          <h3 class="text-foreground text-lg font-bold">
            {{ problem.title }}
          </h3>
          <p class="text-secondary-foreground mt-1.5 leading-relaxed">
            {{ problem.description }}
          </p>
        </li>
      </ul>
    </div>
  </LandingSection>
</template>
