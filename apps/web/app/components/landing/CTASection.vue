<script setup lang="ts">
/**
 * Cierre del landing: un relleno plano del acento y dos acciones.
 *
 * La banda llevaba un degradado diagonal, un patrón cónico y dos lavados
 * blancos superpuestos. Además de ruido decorativo, el fondo compuesto dejaba
 * el párrafo en 4.41:1 (por debajo de AA para texto normal) y ninguno de esos
 * degradados es resoluble por axe, así que el nodo vivía en `incomplete` con su
 * ratio escrito a mano. Plano y con el relleno de acción, el contraste es
 * verificable y la marca no depende de un degradado.
 *
 * `secondaryHref` existe porque la banda se reusa fuera de la landing: el ancla
 * `#pricing` sólo resuelve en la home, así que las demás públicas apuntan a la
 * página de precios (si no, el botón no llevaría a ningún sitio).
 */
withDefaults(
  defineProps<{
    secondaryHref?: string;
  }>(),
  { secondaryHref: "#pricing" },
);

/**
 * El destino decide el elemento: un ancla de la misma página va en `<a>` y una
 * ruta interna en `NuxtLink` (la convención del repo — un `<a>` a una ruta
 * interna convierte el click en una recarga completa). La clase vive aquí para
 * que las dos ramas no puedan divergir.
 */
const SECONDARY_CLASS =
  "text-text-on-accent focus-visible:ring-text-on-accent inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/50 px-5 py-3 text-sm font-bold transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]";
</script>

<template>
  <section id="cta" class="bg-accent-solid scroll-mt-16">
    <div
      class="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 md:py-28"
    >
      <h2
        class="landing-heading text-text-on-accent font-display text-3xl leading-[1.1] font-black md:text-4xl"
      >
        Ponle precio a tu próxima receta
      </h2>
      <p class="text-text-on-accent mt-4 text-lg font-medium">
        En tu primera receta ves el costo, el margen y cuánto cobrar.
      </p>
      <div
        class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <NuxtLink
          to="/sign-in"
          class="text-accent-solid focus-visible:ring-text-on-accent focus-visible:ring-offset-accent-solid inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold shadow-lg shadow-black/10 transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          <Icon name="lucide:arrow-up-circle" :size="16" />
          Comenzar gratis
        </NuxtLink>
        <NuxtLink
          v-if="secondaryHref.startsWith('/')"
          :to="secondaryHref"
          :class="SECONDARY_CLASS"
        >
          Ver planes
        </NuxtLink>
        <a v-else :href="secondaryHref" :class="SECONDARY_CLASS">
          Ver planes
        </a>
      </div>
    </div>
  </section>
</template>
