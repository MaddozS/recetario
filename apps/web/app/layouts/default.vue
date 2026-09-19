<template>
  <div
    class="bg-background flex min-h-dvh flex-col md:h-dvh md:overflow-hidden"
  >
    <a
      href="#main-content"
      class="focus:bg-accent-solid focus:text-text-on-accent sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-xl focus:px-4 focus:py-2 focus:outline-none"
    >
      Saltar al contenido
    </a>
    <main
      id="main-content"
      class="bg-background w-full flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8"
    >
      <div class="mx-auto max-w-7xl">
        <slot />
      </div>
    </main>
  </div>
</template>
