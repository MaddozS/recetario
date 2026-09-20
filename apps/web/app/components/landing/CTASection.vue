<script setup lang="ts">
/** CTA final del landing. Port literal del `CTASection`. */
</script>

<template>
  <section
    id="cta"
    v-reveal
    class="relative isolate overflow-hidden py-24 md:py-32"
  >
    <!-- La banda usa el relleno sólido del acento: el mismo coral en claro y
         oscuro, así cambiar de tema no cambia la marca de la sección. -->
    <div class="bg-accent-solid absolute inset-0" />
    <div
      aria-hidden="true"
      class="from-accent-solid to-accent-solid-hover absolute inset-0 bg-linear-to-br"
    />

    <div
      aria-hidden="true"
      class="absolute inset-0 bg-[repeating-conic-gradient(var(--tw-bg)_0_0.5deg,transparent_0_1deg)] opacity-[0.03]"
    />

    <!-- Lavado decorativo rebajado: con 0.12/0.07 el fondo renderizado bajo el
         párrafo aclaraba lo suficiente para dejar la etiqueta blanca en 4.41:1
         (AA exige 4.5:1). Medido por la sonda de contraste de `contrast.spec`. -->
    <div
      aria-hidden="true"
      class="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_30%,rgba(255,255,255,0.06)_0%,transparent_60%),radial-gradient(ellipse_40%_50%_at_80%_70%,rgba(255,255,255,0.04)_0%,transparent_50%)]"
    />

    <div class="relative z-10 mx-auto max-w-3xl px-6 text-center">
      <h2
        class="landing-heading text-text-on-accent text-3xl leading-[1.1] font-black md:text-4xl lg:text-5xl"
      >
        Empieza a calcular el costo real de tus recetas hoy
      </h2>
      <p class="text-text-on-accent mt-4 text-lg font-medium">
        Sin tarjeta de crédito. Configuración en segundos.
      </p>
      <div
        class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <NuxtLink
          to="/sign-in"
          class="text-accent-solid focus-visible:ring-offset-(--color-accent-solid) inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold shadow-lg shadow-black/10 transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          <Icon name="lucide:arrow-up-circle" :size="16" />
          Comenzar gratis
        </NuxtLink>
        <a
          href="#pricing"
          class="text-text-on-accent inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-bold backdrop-blur-sm transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-[0.97]"
        >
          Ver planes
        </a>
      </div>
    </div>
  </section>
</template>
