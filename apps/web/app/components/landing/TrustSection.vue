<script setup lang="ts">
/**
 * Sección de confianza y segmentos.
 * Demuestra para quién está diseñado el producto y las garantías de servicio.
 */
const AUDIENCES = [
  {
    icon: 'lucide:cake',
    title: 'Reposteros por encargo',
    description:
      'Pasteles, galletas, mesas de postres y piezas decoradas con costos de insumos exactos.',
  },
  {
    icon: 'lucide:utensils-crossed',
    title: 'Catering y banquetes',
    description: 'Menús para eventos y cotizaciones por porción calculadas con margen asegurado.',
  },
  {
    icon: 'lucide:coffee',
    title: 'Cafeterías y dark kitchens',
    description: 'Estandarización de porciones y control de costos de recetas para equipo y barra.',
  },
  {
    icon: 'lucide:package',
    title: 'Productores artesanales',
    description:
      'Salsas, mermeladas, pan de masa madre y alimentos empacados para venta al mayoreo o menudeo.',
  },
] as const;

const GUARANTEES = [
  { icon: 'lucide:credit-card', text: 'Sin tarjeta para comenzar' },
  { icon: 'lucide:infinity', text: 'Plan gratis sin caducidad' },
  { icon: 'lucide:calendar-check', text: 'Cancela cuando quieras' },
  { icon: 'lucide:smartphone', text: 'Funciona en celular y tablet' },
  { icon: 'lucide:shield-check', text: 'Datos privados y seguros' },
] as const;
</script>

<template>
  <LandingSection id="confianza" tone="warm" decor="glow-corner" bordered>
    <div v-reveal>
      <LandingSectionHeading
        eyebrow="Hecho a tu medida"
        title="Diseñado para negocios de comida"
        description="Desde quien hornea en casa hasta cocinas en crecimiento. Si vendes alimentos preparados, KitchCalc es para ti."
      />

      <!-- Segmentos -->
      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="item in AUDIENCES"
          :key="item.title"
          class="bg-card border-border hover:border-accent-300 flex flex-col rounded-2xl border p-5 shadow-xs transition-colors"
        >
          <span
            class="bg-accent-50 text-accent-text flex h-11 w-11 items-center justify-center rounded-xl"
          >
            <Icon :name="item.icon" :size="22" />
          </span>
          <h3 class="text-foreground mt-4 text-base font-bold">
            {{ item.title }}
          </h3>
          <p class="text-secondary-foreground mt-2 text-xs leading-relaxed sm:text-sm">
            {{ item.description }}
          </p>
        </div>
      </div>

      <!-- Garantías -->
      <div class="border-border mt-12 border-t pt-8">
        <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:gap-12">
          <div
            v-for="g in GUARANTEES"
            :key="g.text"
            class="text-secondary-foreground flex items-center gap-2 text-xs font-semibold sm:text-sm"
          >
            <Icon :name="g.icon" :size="18" class="text-accent-text shrink-0" />
            <span>{{ g.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </LandingSection>
</template>
