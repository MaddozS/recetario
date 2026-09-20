<script setup lang="ts">
/** Footer del landing. Port literal del `LandingFooter` del baseline. */
const year = new Date().getFullYear();

const PRODUCT_LINKS = [
  { href: "/#features", label: "Funciones" },
  { href: "/#how-it-works", label: "Cómo funciona" },
  { href: "/#pricing", label: "Precios" },
] as const;

const ACCESS_LINKS = [
  { href: "/sign-in", label: "Iniciar sesión" },
  { href: "/sign-up", label: "Registrarse" },
] as const;
</script>

<template>
  <footer v-reveal class="border-border bg-card border-t">
    <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <div class="grid gap-6 md:grid-cols-2 md:gap-12">
        <div>
          <NuxtLink
            to="/"
            class="focus-ring flex items-center gap-2.5 rounded-lg"
          >
            <img
              src="/kitchcalc_logo.svg"
              alt="KitchCalc"
              class="h-8 w-8 rounded-lg"
            />
            <span class="text-foreground text-base font-black">KitchCalc</span>
          </NuxtLink>
          <p
            class="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed"
          >
            La forma más simple de calcular costos, márgenes y precios para tu
            negocio de alimentos.
          </p>

          <div class="mt-6 flex items-center gap-4">
            <NuxtLink
              to="/privacy"
              class="text-muted-foreground hover:text-foreground focus-ring rounded text-xs transition-colors"
            >
              Privacidad
            </NuxtLink>
            <span class="text-subtle-foreground text-xs">·</span>
            <NuxtLink
              to="/terms"
              class="text-muted-foreground hover:text-foreground focus-ring rounded text-xs transition-colors"
            >
              Términos
            </NuxtLink>
          </div>
        </div>

        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-end sm:gap-10"
        >
          <div>
            <h3
              class="text-foreground text-xs font-semibold tracking-wider uppercase"
            >
              Producto
            </h3>
            <ul class="mt-3 space-y-2.5">
              <li v-for="link in PRODUCT_LINKS" :key="link.href">
                <a
                  :href="link.href"
                  class="text-muted-foreground hover:text-foreground focus-ring rounded text-sm transition-colors"
                >
                  {{ link.label }}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3
              class="text-foreground text-xs font-semibold tracking-wider uppercase"
            >
              Acceso
            </h3>
            <ul class="mt-3 space-y-2.5">
              <li v-for="link in ACCESS_LINKS" :key="link.href">
                <NuxtLink
                  :to="link.href"
                  class="text-muted-foreground hover:text-foreground focus-ring rounded text-sm transition-colors"
                >
                  {{ link.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="border-border mt-8 border-t pt-6 md:mt-12 md:pt-8">
        <p class="text-muted-foreground text-center text-sm">
          © {{ year }} KitchCalc. Todos los derechos reservados.
        </p>
      </div>
    </div>
  </footer>
</template>
