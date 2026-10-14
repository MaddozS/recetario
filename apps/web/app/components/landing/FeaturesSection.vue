<script setup lang="ts">
import { computed, ref } from 'vue';

/**
 * Los módulos principales de KitchCalc con capturas reales.
 *
 * En móvil y tablet (< lg) se presenta un selector de pestañas para que el
 * usuario examine los módulos sin tener que desplazarse por más de 2000px de
 * pantalla vertical. En desktop (lg+) se conserva el formato de vitrina
 * alternado.
 */
interface LandingModule {
  id: string;
  icon: string;
  title: string;
  shortTitle: string;
  summary: string;
  availability: string;
  capabilities: readonly string[];
  image: string;
}

const MODULES: readonly LandingModule[] = [
  {
    id: 'recipes',
    icon: 'lucide:calculator',
    title: 'Recetas y costeo',
    shortTitle: 'Recetas',
    availability: 'Todos los planes',
    summary:
      'Cada ingrediente con su cantidad y su costo. El costo de la receta se calcula en el momento, por lote y por porción.',
    capabilities: [
      'Costo por lote y por porción',
      'Presentaciones con su propio precio',
      'Gastos fijos por monto o porcentaje',
    ],
    image: '/receta_light.webp',
  },
  {
    id: 'ingredients',
    icon: 'lucide:package-search',
    title: 'Ingredientes y precios de compra',
    shortTitle: 'Ingredientes',
    availability: 'Todos los planes',
    summary:
      'Guardas cómo compras, no cómo cocinas: el kilo, el litro, la caja. KitchCalc convierte a la unidad que pide la receta.',
    capabilities: [
      'Precio por unidad de compra',
      'Conversión automática de unidades',
      'Proveedor y marca de cada ingrediente',
    ],
    image: '/ingredientes_light.webp',
  },
  {
    id: 'production',
    icon: 'lucide:factory',
    title: 'Planificador de producción',
    shortTitle: 'Producción',
    availability: 'Basic y Pro',
    summary:
      'Eliges las recetas, multiplicas los lotes y ves el costo total, el costo por unidad y el precio de venta del conjunto.',
    capabilities: [
      'Multiplicadores por lote',
      'Costo por unidad producida',
      'Suma consolidada de insumos a comprar',
    ],
    image: '/produccion_light.webp',
  },
];

const activeTab = ref(MODULES[0]!.id);
const currentModule = computed(() => MODULES.find((m) => m.id === activeTab.value) ?? MODULES[0]!);

/** Capacidades del catálogo efectivamente disponibles en la plataforma. */
const ALSO_INCLUDED = [
  'Márgenes y precio sugerido',
  'Categorías de recetas',
  'Duplicar recetas',
  'Presentaciones por porción',
  'Gastos fijos configurables',
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
  <LandingSection id="features" tone="card" decor="grid" bordered>
    <div id="funciones" class="scroll-mt-16">
      <LandingSectionHeading
        eyebrow="Funciones"
        title="Cada número, trazable"
        description="El mismo dato recorre ingredientes, recetas y producción. No se recaptura, así que no se desincroniza."
      />

      <!-- Selector por pestañas en móvil y tablet (< lg) -->
      <div class="mt-8 block lg:hidden">
        <div class="bg-muted border-border flex gap-1 rounded-xl border p-1">
          <button
            v-for="module in MODULES"
            :key="module.id"
            type="button"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-center text-xs font-bold transition-all sm:text-sm"
            :class="
              activeTab === module.id
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="activeTab = module.id"
          >
            <Icon :name="module.icon" :size="16" />
            <span>{{ module.shortTitle }}</span>
          </button>
        </div>

        <div class="bg-card border-border mt-6 rounded-2xl border p-5 shadow-xs">
          <div class="flex items-center justify-between gap-2">
            <span class="text-accent-text font-mono text-xs font-bold">
              {{ currentModule.availability }}
            </span>
            <Icon :name="currentModule.icon" :size="20" class="text-accent-text" />
          </div>

          <h3 class="text-foreground mt-2 text-xl font-bold">
            {{ currentModule.title }}
          </h3>
          <p class="text-secondary-foreground mt-2 text-sm leading-relaxed">
            {{ currentModule.summary }}
          </p>

          <ul class="mt-4 space-y-2">
            <li
              v-for="capability in currentModule.capabilities"
              :key="capability"
              class="text-secondary-foreground flex items-start gap-2 text-xs sm:text-sm"
            >
              <Icon name="lucide:check" :size="15" class="text-accent-text mt-0.5 shrink-0" />
              {{ capability }}
            </li>
          </ul>

          <div class="mt-5">
            <button
              type="button"
              data-lightbox-trigger
              class="group/lightbox focus-ring w-full cursor-pointer rounded-xl text-left"
              :aria-label="`Ampliar imagen de ${currentModule.title}`"
              @click="openLightbox(currentModule)"
            >
              <img
                :src="currentModule.image"
                :alt="altFor(currentModule)"
                class="border-border block h-auto w-full rounded-xl border shadow-xs transition-shadow group-hover/lightbox:shadow-md"
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
                <span data-zoom-hint-touch class="pointer-fine:hidden"> Toca para ampliar </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Vitrina completa en desktop (lg+) -->
      <div class="mt-14 hidden space-y-20 lg:block xl:space-y-24">
        <article
          v-for="(module, index) in MODULES"
          :key="module.title"
          v-reveal="index % 2 === 0 ? 'left' : 'right'"
          class="grid items-center gap-10 lg:grid-cols-2 lg:gap-14"
        >
          <div :class="index % 2 === 0 ? 'lg:order-1' : 'lg:order-2'">
            <div class="flex items-center gap-3">
              <span class="text-accent-text font-mono text-xs font-bold tabular-nums">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <span class="text-muted-foreground bg-muted rounded-md px-2 py-0.5 font-mono text-xs">
                {{ module.availability }}
              </span>
            </div>

            <h3 class="text-foreground mt-3 flex items-center gap-2.5 text-2xl font-bold">
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
                <Icon name="lucide:check" :size="16" class="text-accent-text mt-0.5 shrink-0" />
                {{ capability }}
              </li>
            </ul>
          </div>

          <div :class="index % 2 === 0 ? 'lg:order-2' : 'lg:order-1'">
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
                  <span data-zoom-hint-touch class="pointer-fine:hidden"> Toca para ampliar </span>
                </span>
              </button>
            </div>
          </div>
        </article>
      </div>

      <div class="border-border mt-14 border-t pt-8">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
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
            class="focus-ring text-accent-text inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded text-sm font-bold hover:underline"
          >
            Ver catálogo completo
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
    </div>
  </LandingSection>
</template>
