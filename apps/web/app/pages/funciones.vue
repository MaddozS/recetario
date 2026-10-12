<script setup lang="ts">
import { computed, ref } from "vue";

definePageMeta({ layout: "public" });

usePageSeo("/funciones");

/**
 * La página de funciones: el detalle de cada módulo, con las mismas capturas
 * reales y el mismo lightbox que la landing.
 *
 * Existe porque pedir el producto entero en una sección obligaba a elegir entre
 * un bloque largo (que nadie lee) o una frase por módulo (que no dice nada). La
 * landing enseña lo que se gana y enlaza aquí; aquí está el qué hace cada cosa.
 */
interface FeatureModule {
  icon: string;
  title: string;
  summary: string;
  details: readonly string[];
  image: string;
}

const MODULES: readonly FeatureModule[] = [
  {
    icon: "lucide:calculator",
    title: "Recetas y costeo",
    summary:
      "Una receta es una lista de ingredientes con cantidades. De ahí sale el costo: lo que compras, lo que usas y lo que te sobra.",
    details: [
      "Costo por lote y por porción, con el divisor que tú declaras",
      "Presentaciones: la misma receta en varios tamaños, cada una con su precio",
      "Costos fijos por monto (luz, mano de obra) o por porcentaje del costo directo",
      "Margen deseado y precio de venta sugerido, recalculados al instante",
      "Instrucciones y notas por paso, agrupables por categoría",
    ],
    image: "/receta_light.webp",
  },
  {
    icon: "lucide:package-search",
    title: "Ingredientes y precios de compra",
    summary:
      "Guardas cómo compras, no cómo cocinas. El costo por unidad se calcula solo y la receta lo usa tal cual.",
    details: [
      "Precio por unidad de compra: kilo, litro, caja o pieza",
      "Conversión automática entre kg/lt y g/ml al usar el insumo",
      "Stock disponible para saber qué te queda",
      "Proveedor y marca de cada ingrediente",
      "Búsqueda que ignora acentos: «platano» encuentra «Plátano»",
    ],
    image: "/ingredientes_light.webp",
  },
  {
    icon: "lucide:factory",
    title: "Planificador de producción",
    summary:
      "Eliges las recetas, defines cuántos lotes de cada una y ves el costo del conjunto antes de encender el horno.",
    details: [
      "Multiplicadores por lote, independientes por receta",
      "Costo total de la producción y costo por unidad producida",
      "Precio de venta del conjunto con el margen aplicado",
      "Resumen imprimible para llevar a la cocina",
    ],
    image: "/produccion_light.webp",
  },
];

/** Lo que no llega a módulo propio, en una línea cada uno. */
const EXTRAS = [
  {
    icon: "lucide:percent",
    title: "Márgenes y precios",
    description: "El margen que elijas define el precio; el sistema hace la división.",
  },
  {
    icon: "lucide:folders",
    title: "Categorías",
    description: "Ordena el recetario por tipo de preparación y fíltralo desde la URL.",
  },
  {
    icon: "lucide:copy",
    title: "Duplicar recetas",
    description: "Parte de una receta probada para crear una variante sin recapturar.",
  },
  {
    icon: "lucide:clock",
    title: "Historial de cambios",
    description: "Qué se editó y cuándo, para saber por qué un costo se movió.",
  },
  {
    icon: "lucide:users",
    title: "Cuentas y planes",
    description: "Sesión por correo o Google, con límites claros por plan.",
  },
  {
    icon: "lucide:list-checks",
    title: "Instrucciones y notas",
    description: "El paso a paso de la preparación, junto a los costos que produce.",
  },
] as const;

const lightboxImage = ref<{ src: string; alt: string } | null>(null);

const lightboxOpen = computed(() => lightboxImage.value !== null);

function altFor(module: FeatureModule): string {
  return `Pantalla del módulo ${module.title} en KitchCalc`;
}

function openLightbox(module: FeatureModule): void {
  lightboxImage.value = { src: module.image, alt: altFor(module) };
}

function closeLightbox(): void {
  lightboxImage.value = null;
}
</script>

<template>
  <div>
    <LandingSection>
      <LandingSectionHeading
        level="h1"
        eyebrow="Funciones"
        title="Qué hace KitchCalc, módulo por módulo"
        description="Tres módulos hacen el trabajo y el resto son comodidades del día a día. Nada de esto pide una hoja de cálculo aparte."
      />

      <div class="mt-16 space-y-16 sm:mt-20 sm:space-y-24">
        <article
          v-for="(module, index) in MODULES"
          :key="module.title"
          v-reveal="index % 2 === 0 ? 'left' : 'right'"
          class="grid items-center gap-8 md:grid-cols-2 md:gap-14"
        >
          <div :class="index % 2 === 0 ? 'md:order-1' : 'md:order-2'">
            <h2
              class="text-foreground flex items-center gap-2.5 text-2xl font-bold"
            >
              <Icon :name="module.icon" :size="22" class="text-accent-text" />
              {{ module.title }}
            </h2>
            <p class="text-secondary-foreground mt-3 leading-relaxed">
              {{ module.summary }}
            </p>
            <ul class="mt-5 space-y-2.5">
              <li
                v-for="detail in module.details"
                :key="detail"
                class="text-secondary-foreground flex items-start gap-2.5 text-sm"
              >
                <Icon
                  name="lucide:check"
                  :size="16"
                  class="text-accent-text mt-0.5 shrink-0"
                />
                {{ detail }}
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
    </LandingSection>

    <LandingSection tone="muted">
      <LandingSectionHeading
        eyebrow="Y además"
        title="Las comodidades del día a día"
        description="Lo que no cambia el resultado, pero ahorra tiempo cada vez que entras."
      />
      <ul class="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="extra in EXTRAS" :key="extra.title" class="flex gap-3.5">
          <Icon
            :name="extra.icon"
            :size="20"
            class="text-accent-text mt-0.5 shrink-0"
          />
          <div>
            <h3 class="text-foreground font-bold">{{ extra.title }}</h3>
            <p class="text-secondary-foreground mt-1 text-sm leading-relaxed">
              {{ extra.description }}
            </p>
          </div>
        </li>
      </ul>

      <p class="text-muted-foreground mt-12 text-sm">
        Qué incluye cada plan y hasta dónde llega el plan gratis:
        <NuxtLink
          to="/pricing"
          class="text-accent-text focus-ring rounded font-bold"
        >
          ver los planes
        </NuxtLink>
        .
      </p>
    </LandingSection>

    <!-- La banda se reusa fuera de la home: aquí "Ver planes" apunta a la
         página de precios, que sí existe en esta ruta. -->
    <LandingCTASection secondary-href="/pricing" />

    <LandingImageLightbox
      :open="lightboxOpen"
      :src="lightboxImage?.src ?? ''"
      :alt="lightboxImage?.alt ?? ''"
      @close="closeLightbox"
    />
  </div>
</template>
