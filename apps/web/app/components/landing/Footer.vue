<script setup lang="ts">
/**
 * Footer del landing. Es el índice permanente del sitio: producto (con la
 * página de funciones), acceso y legales. Los enlaces internos van por
 * `NuxtLink` (el ancla `/#…` incluida) y sólo el correo de contacto es un `<a>`,
 * porque `mailto:` no lo resuelve el router.
 */
const year = new Date().getFullYear();

const CONTACT_EMAIL = 'soporte@kitchcalc.com';

const PRODUCT_LINKS = [
  { href: '/funciones', label: 'Funciones' },
  { href: '/#how-it-works', label: 'Cómo funciona' },
  { href: '/#pricing', label: 'Precios' },
  { href: '/#faq', label: 'Preguntas frecuentes' },
] as const;

const ACCESS_LINKS = [
  { href: '/sign-in', label: 'Iniciar sesión' },
  { href: '/sign-up', label: 'Registrarse' },
] as const;

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacidad' },
  { href: '/terms', label: 'Términos' },
] as const;
</script>

<template>
  <footer class="border-border bg-card border-t">
    <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <div class="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
        <div>
          <NuxtLink to="/" class="focus-ring inline-flex items-center gap-2.5 rounded-lg">
            <img src="/kitchcalc_logo.svg" alt="KitchCalc" class="h-8 w-8 rounded-lg" />
            <span class="text-foreground text-base font-black">KitchCalc</span>
          </NuxtLink>
          <p class="text-secondary-foreground mt-3 max-w-sm text-sm leading-relaxed">
            Calculadora de costos, márgenes y precios para negocios de comida.
          </p>

          <a
            :href="`mailto:${CONTACT_EMAIL}`"
            class="focus-ring text-accent-text mt-5 inline-flex items-center gap-2 rounded text-sm font-bold"
          >
            <Icon name="lucide:mail" :size="16" />
            {{ CONTACT_EMAIL }}
          </a>
        </div>

        <div class="flex flex-col gap-8 sm:flex-row sm:gap-14">
          <div>
            <h2 class="text-foreground text-xs font-bold tracking-wider uppercase">Producto</h2>
            <ul class="mt-3 space-y-2.5">
              <li v-for="link in PRODUCT_LINKS" :key="link.href">
                <NuxtLink
                  :to="link.href"
                  class="text-muted-foreground hover:text-foreground focus-ring rounded text-sm transition-colors"
                >
                  {{ link.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
          <div>
            <h2 class="text-foreground text-xs font-bold tracking-wider uppercase">Acceso</h2>
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

      <div
        class="border-border mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-muted-foreground text-sm">
          © {{ year }} KitchCalc. Todos los derechos reservados.
        </p>
        <div class="flex items-center gap-5">
          <NuxtLink
            v-for="link in LEGAL_LINKS"
            :key="link.href"
            :to="link.href"
            class="text-muted-foreground hover:text-foreground focus-ring rounded text-sm transition-colors"
          >
            {{ link.label }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>
