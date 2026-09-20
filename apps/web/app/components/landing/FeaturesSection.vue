<script setup lang="ts">
import { computed, ref } from "vue";

/**
 * Features con capturas del producto. El par light/dark se resuelve con
 * `isDark` reactivo (antes: `MutationObserver` sobre `<html>`) y el lightbox es
 * estado Vue.
 */
interface LandingFeature {
  icon: string;
  title: string;
  description: string;
  imageLight: string;
  imageDark: string;
}

const FEATURES: readonly LandingFeature[] = [
  {
    icon: "lucide:calculator",
    title: "Costeo con márgenes",
    description:
      "Calcula el costo real de cada receta con ingredientes, márgenes y precios de venta sugeridos automáticamente.",
    imageLight: "/receta_light.webp",
    imageDark: "/receta_dark.webp",
  },
  {
    icon: "lucide:package-search",
    title: "Gestión de ingredientes",
    description:
      "Administra tu inventario de ingredientes con precios actualizados, unidades y stock disponible.",
    imageLight: "/ingredientes_light.webp",
    imageDark: "/ingredientes_dark.webp",
  },
  {
    icon: "lucide:trending-up",
    title: "Planificador de producción",
    description:
      "Planifica tu producción con multiplicadores de batch, costos por unidad y proyecciones de rentabilidad.",
    imageLight: "/produccion_light.webp",
    imageDark: "/produccion_dark.webp",
  },
];

const { isDark } = useTheme();

const lightboxImage = ref<{ src: string; alt: string } | null>(null);

const lightboxOpen = computed(() => lightboxImage.value !== null);

function imageFor(feature: LandingFeature): string {
  return isDark.value ? feature.imageDark : feature.imageLight;
}

function altFor(feature: LandingFeature): string {
  return `Pantalla de la funcionalidad de ${feature.title} en KitchCalc`;
}

function openLightbox(feature: LandingFeature): void {
  lightboxImage.value = { src: imageFor(feature), alt: altFor(feature) };
}

function closeLightbox(): void {
  lightboxImage.value = null;
}
</script>

<template>
  <section id="features" class="bg-background scroll-mt-16 py-24 md:py-32">
    <div class="mx-auto max-w-7xl px-6">
      <div v-reveal class="mx-auto max-w-2xl text-center">
        <h2
          class="landing-heading text-foreground text-3xl font-black md:text-4xl"
        >
          Todo lo que necesitas para costear
        </h2>
        <p class="text-muted-foreground mt-4 text-lg">
          Desde el costo de cada ingrediente hasta el precio final al público,
          KitchCalc cubre cada etapa.
        </p>
      </div>

      <div class="mt-12 space-y-12 sm:mt-20 sm:space-y-20 md:space-y-28">
        <div
          v-for="(feature, index) in FEATURES"
          :key="feature.title"
          v-reveal="index % 2 === 0 ? 'left' : 'right'"
          class="grid items-center gap-10 md:grid-cols-2 md:gap-16"
        >
          <div :class="index % 2 === 0 ? 'md:order-1' : 'md:order-2'">
            <div class="mx-auto max-w-lg">
              <h3 class="text-foreground text-2xl font-bold">
                {{ feature.title }}
              </h3>
              <p class="text-muted-foreground mt-3 text-base leading-relaxed">
                {{ feature.description }}
              </p>
            </div>
          </div>
          <div :class="index % 2 === 0 ? 'md:order-2' : 'md:order-1'">
            <div class="mx-auto w-full max-w-md">
              <button
                type="button"
                data-lightbox-trigger
                class="group/lightbox focus-ring w-full cursor-pointer rounded-2xl text-left"
                :aria-label="`Ampliar imagen de ${feature.title}`"
                @click="openLightbox(feature)"
              >
                <img
                  :src="imageFor(feature)"
                  :alt="altFor(feature)"
                  class="shadow-accent-tint border-border/50 group-hover/lightbox:shadow-accent-300/20 h-auto w-full rounded-2xl border transition-shadow duration-200 group-hover/lightbox:shadow-lg"
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
        </div>
      </div>
    </div>

    <LandingImageLightbox
      :open="lightboxOpen"
      :src="lightboxImage?.src ?? ''"
      :alt="lightboxImage?.alt ?? ''"
      @close="closeLightbox"
    />
  </section>
</template>
