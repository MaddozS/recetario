<template>
  <div class="bg-background text-foreground min-h-dvh">
    <a
      href="#main-content"
      class="focus:text-foreground focus:bg-card focus:border-border sr-only fixed top-4 left-4 z-60 rounded-xl border px-4 py-2 text-sm font-bold shadow-md focus:not-sr-only"
    >
      Saltar al contenido
    </a>

    <nav
      class="border-border bg-background/80 fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl"
    >
      <div
        class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6"
      >
        <a href="/" class="flex shrink-0 items-center gap-2.5">
          <img
            src="/kitchcalc_logo.svg"
            alt="KitchCalc"
            class="h-9 w-9 rounded-xl"
          />
          <span class="text-foreground text-lg font-black">KitchCalc</span>
        </a>
        <LandingThemeToggle />
      </div>
    </nav>

    <main
      id="main-content"
      class="flex min-h-dvh items-center justify-center px-4 pt-16 pb-10"
    >
      <slot />
    </main>

    <AppLoadingOverlay />
  </div>
</template>
