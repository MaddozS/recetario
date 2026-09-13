<template>
  <div class="bg-background text-foreground min-h-dvh">
    <a
      href="#main-content"
      class="focus:text-foreground focus:bg-card focus:border-border sr-only fixed top-4 left-4 z-60 rounded-xl border px-4 py-2 text-sm font-bold shadow-md focus:not-sr-only"
    >
      Saltar al contenido
    </a>

    <LandingNavbar />

    <main id="main-content" tabindex="-1">
      <slot />
    </main>

    <LandingFooter />
  </div>
</template>

<style>
/* Estilos del shell público (antes en el `<style is:global>` del
   `LandingLayout.astro`): scroll suave, reveals, hovers de tarjetas y el pulso
   del plan Pro. Los `reveal-item` se revelan cuando su contenedor `[data-reveal]`
   recibe `reveal-visible` (directiva `v-reveal`). */
html {
  scroll-behavior: smooth;
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

[data-reveal] {
  opacity: 0;
  transition:
    opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
[data-reveal]:not([data-reveal="left"]):not([data-reveal="right"]):not(
    [data-reveal="scale"]
  ) {
  transform: translateY(28px);
}
[data-reveal="left"] {
  transform: translateX(-30px);
}
[data-reveal="right"] {
  transform: translateX(30px);
}
[data-reveal="scale"] {
  transform: scale(0.94);
}
[data-reveal].reveal-visible {
  opacity: 1;
  transform: translateY(0) translateX(0) scale(1);
}

.reveal-item {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.4s cubic-bezier(0.23, 1, 0.32, 1),
    transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  transition-delay: calc(var(--reveal-delay, 0ms));
}
.reveal-visible .reveal-item {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  [data-reveal],
  .reveal-item {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

:root {
  --card-hover-shadow:
    0 12px 40px -8px rgb(0 0 0 / 0.12), 0 0 0 1px var(--aw-accent-200);
  --pricing-hover-shadow:
    0 16px 48px -12px rgb(0 0 0 / 0.12), 0 4px 12px -4px rgb(0 0 0 / 0.06);
  --pricing-pro-hover-shadow:
    0 20px 56px -12px color-mix(in srgb, var(--aw-accent-500) 25%, transparent),
    0 4px 16px -4px color-mix(in srgb, var(--aw-accent-500) 12%, transparent);
  --hero-pattern-color: color-mix(
    in srgb,
    var(--aw-accent-500) 10%,
    transparent
  );
}
.dark {
  --card-hover-shadow:
    0 12px 40px -8px rgb(0 0 0 / 0.4), 0 0 0 1px var(--aw-accent-300);
  --pricing-hover-shadow:
    0 16px 48px -12px rgb(0 0 0 / 0.4),
    0 4px 12px -4px color-mix(in srgb, var(--aw-accent-500) 15%, transparent);
  --pricing-pro-hover-shadow:
    0 20px 56px -12px
      color-mix(in srgb, var(--aw-accent-500) 35%, transparent),
    0 4px 16px -4px color-mix(in srgb, var(--aw-accent-500) 15%, transparent);
  --hero-pattern-color: color-mix(
    in srgb,
    var(--aw-accent-400) 12%,
    transparent
  );
}

.card-hover {
  transition:
    transform 0.25s cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 0.25s cubic-bezier(0.23, 1, 0.32, 1),
    border-color 0.25s cubic-bezier(0.23, 1, 0.32, 1);
}
.card-hover:hover {
  transform: translateY(-6px);
  border-color: var(--aw-accent-200, #c7d2fe);
  box-shadow: var(--card-hover-shadow);
}

.pricing-card-hover {
  transition:
    transform 0.25s cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 0.25s cubic-bezier(0.23, 1, 0.32, 1);
}
.pricing-card-hover:hover {
  transform: translateY(-4px);
  box-shadow: var(--pricing-hover-shadow);
}

@media (min-width: 1024px) {
  .pricing-card-hover-pro {
    transform: scale(1.05);
    transition:
      transform 0.25s cubic-bezier(0.23, 1, 0.32, 1),
      box-shadow 0.25s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .pricing-card-hover-pro:hover {
    transform: scale(1.05) translateY(-4px);
    box-shadow: var(--pricing-pro-hover-shadow);
  }
}

.hero-bg {
  isolation: isolate;
  background:
    radial-gradient(
      ellipse 80% 60% at 30% 40%,
      color-mix(in oklab, var(--aw-accent-200) 55%, transparent) 0%,
      transparent 70%
    ),
    radial-gradient(
      ellipse 60% 50% at 70% 60%,
      color-mix(in oklab, var(--aw-accent-300) 40%, transparent) 0%,
      transparent 60%
    ),
    var(--tw-bg);
}

.hero-pattern {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 48px,
    var(--hero-pattern-color) 48px,
    var(--hero-pattern-color) 49px
  );
  background-size: 69px 69px;
}

.plan-pro {
  animation: pro-pulse 2.5s ease-in-out infinite;
}
.plan-pro:hover {
  animation: none;
}
@keyframes pro-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 1px var(--aw-accent-200, #c7d2fe),
      0 8px 30px -6px color-mix(in srgb, var(--aw-accent-500) 20%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 2px var(--aw-accent-300, #a5b4fc),
      0 8px 40px -4px color-mix(in srgb, var(--aw-accent-500) 40%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .plan-pro {
    animation: none;
  }
}

.landing-heading {
  text-wrap: balance;
}
</style>
