<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

/**
 * Navbar del landing. El drawer móvil, el bloqueo de scroll, el cierre con
 * Escape y el scroll-spy son estado Vue con cleanup; no hay globals ni
 * listeners manuales.
 *
 * El drawer es un `role="dialog"`: al abrir mueve el foco al panel y deja
 * `inert` el resto del layout público (los hermanos del overlay), así que no
 * queda nada enfocable fuera del diálogo. Al cerrar, el foco vuelve al
 * hamburger.
 *
 * El panel es destino de foco, no un control: su `outline` se apaga (mismo
 * criterio que el `tabindex="-1"` de `PreferencesSection`) porque el navegador
 * pintaba el anillo azul por defecto sobre todo el borde de la pantalla. El
 * primer Tab entra al botón de cierre, que sí lleva el anillo de marca.
 *
 * No monta `LandingThemeToggle`: el marketing es claro (lo fuerza `app.vue`), así
 * que un botón de tema aquí no tendría a dónde ir. El toggle sigue en el layout
 * de auth.
 */
import { LANDING_CTAS } from '~/features/landing/landing-ctas';

interface NavLink {
  readonly href: string;
  readonly label: string;
  /** Ancla del landing que este enlace resalta mientras está en viewport. */
  readonly section?: string;
}

/** El nav es el índice del sitio, no sólo del scroll: "Funciones" abre la página. */
const NAV_LINKS: readonly NavLink[] = [
  { href: '/funciones', label: 'Funciones' },
  { href: '/#how-it-works', label: 'Cómo funciona', section: 'how-it-works' },
  { href: '/#pricing', label: 'Precios', section: 'pricing' },
  { href: '/#faq', label: 'Preguntas', section: 'faq' },
];

const SCROLL_SPY_SECTIONS = ['how-it-works', 'pricing', 'faq'] as const;

const { isAuthenticated } = useAuth();
const route = useRoute();
const activeSection = useLandingScrollSpy(SCROLL_SPY_SECTIONS);

const menuOpen = ref(false);
const menuButton = ref<HTMLButtonElement | null>(null);
const menuOverlay = ref<HTMLElement | null>(null);
const menuPanel = ref<HTMLElement | null>(null);

/** Hermanos del overlay que quedaron `inert` con el drawer abierto. */
let inertedBackground: HTMLElement[] = [];

function setBackgroundInert(inert: boolean): void {
  if (!inert) {
    for (const element of inertedBackground) element.inert = false;
    inertedBackground = [];
    return;
  }

  const shell = menuOverlay.value?.parentElement;
  if (!shell) return;

  inertedBackground = [...shell.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child !== menuOverlay.value && !child.inert
  );
  for (const element of inertedBackground) element.inert = true;
}

function openMenu(): void {
  menuOpen.value = true;
}

function closeMenu(): void {
  menuOpen.value = false;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeMenu();
}

watch(menuOpen, async (open) => {
  document.body.style.overflow = open ? 'hidden' : '';

  if (open) {
    await nextTick();
    if (!menuOpen.value) return;
    setBackgroundInert(true);
    menuPanel.value?.focus();
    return;
  }

  const restoreFocus = menuOverlay.value?.contains(document.activeElement) ?? false;
  setBackgroundInert(false);
  if (restoreFocus) menuButton.value?.focus();
});

watch(
  () => route.fullPath,
  () => closeMenu()
);

onMounted(() => document.addEventListener('keydown', onKeydown));

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
  setBackgroundInert(false);
});

function isActive(link: NavLink): boolean {
  if (!link.section) return route.path === link.href;
  return route.path === '/' && activeSection.value === link.section;
}
</script>

<template>
  <nav
    class="border-border bg-background fixed inset-x-0 top-0 z-50 border-b shadow-xs transition-all"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
      <div class="flex items-center gap-2">
        <button
          id="landing-mobile-menu-btn"
          ref="menuButton"
          type="button"
          class="text-muted-foreground hover:text-foreground hover:bg-hover-muted focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors md:hidden"
          aria-label="Abrir menú"
          aria-haspopup="dialog"
          aria-controls="landing-mobile-menu"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          @click="openMenu"
        >
          <Icon name="lucide:menu" :size="20" />
        </button>
        <NuxtLink to="/" class="focus-ring flex shrink-0 items-center gap-2.5 rounded-xl">
          <img src="/kitchcalc_logo.svg" alt="KitchCalc" class="h-9 w-9 rounded-xl" />
          <span class="text-foreground text-lg font-black sm:inline"> KitchCalc </span>
        </NuxtLink>
      </div>

      <div class="hidden items-center gap-7 md:flex">
        <NuxtLink
          v-for="link in NAV_LINKS"
          :key="link.href"
          :to="link.href"
          class="text-muted-foreground hover:text-foreground focus-ring rounded-md text-sm font-medium transition-colors"
          :aria-current="isActive(link) && !link.section ? 'page' : undefined"
          :data-spy-active="isActive(link) ? '1' : undefined"
        >
          {{ link.label }}
        </NuxtLink>
      </div>

      <div class="hidden items-center gap-4 sm:flex">
        <template v-if="!isAuthenticated">
          <NuxtLink
            to="/sign-in"
            class="text-muted-foreground hover:text-foreground focus-ring rounded-lg px-2 py-1 text-sm font-semibold transition-colors"
          >
            Iniciar sesión
          </NuxtLink>
          <Button variant="primary" :href="LANDING_CTAS.signUp"> Crear cuenta gratis </Button>
        </template>
        <template v-else>
          <Button variant="primary" :href="LANDING_CTAS.app"> Ir a la app </Button>
        </template>
      </div>

      <div class="sm:hidden">
        <Button
          variant="primary"
          class="min-h-9 px-3 py-2 text-xs"
          :href="isAuthenticated ? LANDING_CTAS.app : LANDING_CTAS.signUp"
        >
          {{ isAuthenticated ? 'Ir a la app' : 'Comenzar' }}
        </Button>
      </div>
    </div>
  </nav>

  <div
    id="landing-mobile-menu"
    ref="menuOverlay"
    class="fixed inset-0 z-10000 md:hidden"
    role="dialog"
    aria-modal="true"
    aria-label="Menú"
    :data-open="menuOpen ? '1' : '0'"
    :inert="!menuOpen"
  >
    <div id="landing-mobile-backdrop" class="bg-backdrop absolute inset-0 z-0" @click="closeMenu" />
    <div
      id="landing-mobile-panel"
      ref="menuPanel"
      tabindex="-1"
      class="border-border bg-card absolute top-0 left-0 isolate z-10 flex h-full w-80 max-w-[85vw] flex-col border-r p-6 shadow-2xl outline-none"
    >
      <div class="border-border flex items-center justify-between border-b pb-4">
        <div class="flex items-center gap-2.5">
          <img src="/kitchcalc_logo.svg" alt="KitchCalc" class="h-8 w-8 rounded-lg" />
          <span class="text-foreground text-base font-black">KitchCalc</span>
        </div>
        <button
          id="landing-mobile-menu-close"
          type="button"
          class="text-muted-foreground hover:text-foreground hover:bg-hover-muted focus-ring inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl transition-colors"
          aria-label="Cerrar menú"
          @click="closeMenu"
        >
          <Icon name="lucide:x" :size="20" />
        </button>
      </div>

      <nav class="mt-6 flex-1 space-y-2">
        <NuxtLink
          v-for="link in NAV_LINKS"
          :key="link.href"
          :to="link.href"
          class="text-foreground hover:text-accent-text hover:bg-muted focus-ring flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold transition-colors"
          :aria-current="isActive(link) && !link.section ? 'page' : undefined"
          @click="closeMenu"
        >
          <span>{{ link.label }}</span>
          <Icon name="lucide:chevron-right" :size="16" class="text-muted-foreground" />
        </NuxtLink>
      </nav>

      <div class="border-border space-y-3 border-t pt-5">
        <template v-if="!isAuthenticated">
          <Button
            variant="primary"
            class="w-full justify-center"
            :href="LANDING_CTAS.signUp"
            @click="closeMenu"
          >
            Crear cuenta gratis
          </Button>
          <NuxtLink
            to="/sign-in"
            class="focus-ring border-border bg-card text-foreground hover:bg-muted flex min-h-11 w-full items-center justify-center rounded-xl border text-sm font-bold transition-colors"
            @click="closeMenu"
          >
            Iniciar sesión
          </NuxtLink>
          <p class="text-muted-foreground text-center text-xs">
            Sin tarjeta · 10 recetas gratis para siempre
          </p>
        </template>
        <template v-else>
          <Button
            variant="primary"
            class="w-full justify-center"
            :href="LANDING_CTAS.app"
            @click="closeMenu"
          >
            Ir a la app
          </Button>
        </template>
      </div>
    </div>
  </div>
</template>

<style>
#landing-mobile-menu {
  pointer-events: none;
}
#landing-mobile-menu[data-open='1'] {
  pointer-events: auto;
}
#landing-mobile-backdrop {
  opacity: 0;
  transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
#landing-mobile-menu[data-open='1'] #landing-mobile-backdrop {
  opacity: 1;
}
#landing-mobile-panel {
  transform: translateX(-100%);
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
#landing-mobile-menu[data-open='1'] #landing-mobile-panel {
  transform: translateX(0);
}
a[data-spy-active] {
  color: var(--aw-accent-text);
}

@media (prefers-reduced-motion: reduce) {
  /* Sólo se retira la animación: el estado abierto/cerrado lo sigue
     gobernando `data-open` (el original forzaba `translateX(0)`, que dejaba el
     panel visible con el menú cerrado). */
  #landing-mobile-backdrop,
  #landing-mobile-panel {
    transition: none;
  }
}
</style>
