<script setup lang="ts">
/** CTA final del landing. Port literal del `CTASection.astro`. */
</script>

<template>
  <section
    id="cta"
    v-reveal
    class="relative isolate overflow-hidden py-24 md:py-32"
  >
    <div
      class="from-accent-500 via-accent-600 to-accent-700 absolute inset-0 bg-linear-to-br"
    />

    <div
      aria-hidden="true"
      class="absolute inset-0 bg-[repeating-conic-gradient(var(--tw-bg)_0_0.5deg,transparent_0_1deg)] opacity-[0.03]"
    />

    <div
      class="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_30%,rgba(255,255,255,0.10)_0%,transparent_60%),radial-gradient(ellipse_40%_50%_at_80%_70%,rgba(255,255,255,0.06)_0%,transparent_50%)] dark:bg-[radial-gradient(ellipse_60%_40%_at_25%_35%,color-mix(in_oklch,var(--aw-accent-300),transparent_80%)_0%,transparent_50%),radial-gradient(ellipse_40%_40%_at_75%_65%,color-mix(in_oklch,var(--aw-accent-400),transparent_85%)_0%,transparent_50%)]"
    />

    <div class="relative z-10 mx-auto max-w-3xl px-6 text-center">
      <h2
        class="landing-heading text-text-on-accent text-3xl leading-[1.1] font-black md:text-4xl lg:text-5xl"
      >
        Empieza a calcular el costo real de tus recetas hoy
      </h2>
      <p class="text-text-on-accent/80 mt-4 text-lg">
        Sin tarjeta de crédito. Configuración en segundos.
      </p>
      <div
        class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <a
          href="/sign-in"
          class="bg-card text-accent-600 focus-visible:ring-accent-500 dark:text-accent-700 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-lg shadow-black/15 transition-all hover:brightness-90 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] dark:bg-white dark:shadow-black/30"
        >
          <Icon name="lucide:arrow-up-circle" :size="16" />
          Comenzar gratis
        </a>
        <a
          href="#pricing"
          class="border-border/30 bg-card/10 text-text-on-accent hover:bg-card/20 focus-visible:ring-accent-500 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold shadow-none backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] dark:border-white/20 dark:hover:bg-white/20"
        >
          Ver planes
        </a>
      </div>
    </div>
  </section>
</template>
