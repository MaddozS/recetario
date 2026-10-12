<script setup lang="ts">
import { computed, ref } from "vue";

/**
 * Los módulos, cada uno con una captura real del producto (el lightbox es estado
 * Vue y el par de imágenes ya es uno solo: el marketing es claro).
 *
 * Cada bloque declara qué resuelve y tres capacidades concretas, en vez de la
 * frase de marketing suelta que tenía antes. El catálogo completo vive en
 * `/funciones`, que es la página que explica módulo por módulo; aquí sólo
 * asoma lo que se gana y el enlace.
 */
interface LandingModule {
  icon: string;
  title: string;
  summary: string;
  capabilities: readonly string[];
  image: string;
}

const MODULES: readonly LandingModule[] = [
  {
    icon: "lucide:calculator",
    title: "Recetas y costeo",
    summary:
      "Cada ingrediente con su cantidad y su costo. El costo de la mezcla se recalcula en el momento, por lote y por porción.",
    capabilities: [
      "Costo por lote y por porción",
      "Presentaciones con su propio precio",
      "Costos fijos por monto o porcentaje",
    ],
    image: "/receta_light.webp",
  },
  {
    icon: "lucide:package-search",
    title: "Ingredientes y precios de compra",
    summary:
      "Guardas cómo compras, no cómo cocinas: el kilo, el litro, la caja. KitchCalc convierte a la unidad que pide la receta.",
    capabilities: [
      "Precio por unidad de compra",
      "Stock disponible por insumo",
      "Proveedor y marca de cada ingrediente",
    ],
    image: "/ingredientes_light.webp",
  },
  {
    icon: "lucide:factory",
    title: "Planificador de producción",
    summary:
      "Eliges las recetas, multiplicas los lotes y ves el costo total, el costo por unidad y el precio de venta del conjunto.",
    capabilities: [
      "Multiplicadores por lote",
      "Costo por unidad producida",
      "Resumen listo para imprimir",
    ],
    image: "/produccion_light.webp",
  },
];

/** Capacidades del catálogo que no llegan a módulo propio, en texto. */
const ALSO_INCLUDED = [
  "Márgenes y precio sugerido",
  "Categorías de recetas",
  "Duplicar recetas",
  "Instrucciones y notas por paso",
  "Historial de cambios",
] as const;

const lightboxImage = ref<{ src: string; alt: string } | null>(null);

const lightboxOpen = computed(() => lightboxImage.value !== null);

function altFor(module: LandingModule): string {
  return `Pantalla del módulo ${module.title} en KitchCalc`;
}

function openLightbox(module: LandingModule): void {
  lightboxImage.value = { src: module.image, alt: altFor(module) };
}

function closeLightbox(): void {
  lightboxImage.value = null;
}
</script>

<template>
  <LandingSection id="features">
    <LandingSectionHeading
      eyebrow="Funciones"
      title="Cada número, trazable"
      description="El mismo dato recorre ingredientes, recetas y producción. No se recaptura, así que no se desincroniza."
    />

    <div class="mt-14 space-y-16 sm:mt-20 sm:space-y-20 md:space-y-24">
      <article
        v-for="(module, index) in MODULES"
        :key="module.title"
        v-reveal="index % 2 === 0 ? 'left' : 'right'"
        class="grid items-center gap-8 md:grid-cols-2 md:gap-14"
      >
        <div :class="index % 2 === 0 ? 'md:order-1' : 'md:order-2'">
          <p class="text-accent-text font-mono text-xs font-bold tabular-nums">
            {{ String(index + 1).padStart(2, "0") }}
          </p>
          <h3
            class="text-foreground mt-2 flex items-center gap-2.5 text-2xl font-bold"
          >
            <Icon :name="module.icon" :size="22" class="text-accent-text" />
            {{ module.title }}
          </h3>
          <p class="text-secondary-foreground mt-3 leading-relaxed">
            {{ module.summary }}
          </p>
          <ul class="mt-5 space-y-2.5">
            <li
              v-for="capability in module.capabilities"
              :key="capability"
              class="text-secondary-foreground flex items-start gap-2.5 text-sm"
            >
              <Icon
                name="lucide:check"
                :size="16"
                class="text-accent-text mt-0.5 shrink-0"
              />
              {{ capability }}
            </li>
          </ul>
        </div>

        <div :class="index % 2 === 0 ? 'md:order-2' : 'md:order-1'">
          <div class="mx-auto w-full max-w-lg">
            <button
              type="button"
              data-lightbox-trigger
              class="group/lightbox focus-ring w-full cursor-pointer rounded-2xl text-left"
              :aria-label="`Ampliar imagen de ${module.title}`"
              @click="openLightbox(module)"
            >
              <img
                :src="module.image"
                :alt="altFor(module)"
                class="border-border block h-auto w-full rounded-2xl border shadow-sm transition-shadow duration-200 group-hover/lightbox:shadow-lg"
                loading="lazy"
                decoding="async"
                width="800"
                height="600"
              />
              <span
                data-zoom-hint
                class="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs opacity-0 transition-opacity group-hover/lightbox:opacity-100 group-focus-visible/lightbox:opacity-100 max-md:opacity-100 pointer-coarse:opacity-100"
              >
                <Icon name="lucide:zoom-in" :size="14" />
                <span data-zoom-hint-fine class="hidden pointer-fine:inline">
                  Click para ampliar
                </span>
                <span data-zoom-hint-touch class="pointer-fine:hidden">
                  Toca para ampliar
                </span>
              </span>
            </button>
          </div>
        </div>
      </article>
    </div>

    <div class="border-border mt-16 border-t pt-8">
      <div
        class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p class="section-label">También incluye</p>
          <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <li
              v-for="item in ALSO_INCLUDED"
              :key="item"
              class="text-secondary-foreground text-sm"
            >
              {{ item }}
            </li>
          </ul>
        </div>
        <NuxtLink
          to="/funciones"
          class="focus-ring text-accent-text inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded text-sm font-bold"
        >
          Ver todas las funciones
          <Icon name="lucide:arrow-right" :size="16" />
        </NuxtLink>
      </div>
    </div>

    <LandingImageLightbox
      :open="lightboxOpen"
      :src="lightboxImage?.src ?? ''"
      :alt="lightboxImage?.alt ?? ''"
      @close="closeLightbox"
    />
  </LandingSection>
</template>
