<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

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
 */
const SECTIONS = ["features", "how-it-works", "pricing"] as const;
const NAV_LINKS = [
  { href: "/#features", label: "Funciones" },
  { href: "/#how-it-works", label: "Cómo funciona" },
  { href: "/#pricing", label: "Precios" },
] as const;

const { isAuthenticated } = useAuth();
const route = useRoute();
const activeSection = useLandingScrollSpy(SECTIONS);

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
      child instanceof HTMLElement &&
      child !== menuOverlay.value &&
      !child.inert,
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
  if (event.key === "Escape") closeMenu();
}

watch(menuOpen, async (open) => {
  document.body.style.overflow = open ? "hidden" : "";

  if (open) {
    await nextTick();
    // Un cierre en el mismo tick (p. ej. el cambio de ruta que dispara el
    // `watch` de abajo) no debe dejar la página inerte con el drawer cerrado.
    if (!menuOpen.value) return;
    setBackgroundInert(true);
    menuPanel.value?.focus();
    return;
  }

  // El foco sólo vuelve al hamburger si venía de dentro del panel: cerrar con
  // el ratón (backdrop) no debe robarle el foco a nadie.
  const restoreFocus =
    menuOverlay.value?.contains(document.activeElement) ?? false;
  setBackgroundInert(false);
  if (restoreFocus) menuButton.value?.focus();
});

watch(
  () => route.fullPath,
  () => closeMenu(),
);

onMounted(() => document.addEventListener("keydown", onKeydown));

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
  setBackgroundInert(false);
});

function isActive(href: string): boolean {
  return href === `/#${activeSection.value}`;
}
</script>

<template>
  <nav
    class="border-border bg-background fixed inset-x-0 top-0 z-50 border-b shadow-sm"
  >
    <div
      class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"
    >
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
          <img
            src="/kitchcalc_logo.svg"
            alt="KitchCalc"
            class="h-9 w-9 rounded-xl"
          />
          <span class="text-foreground hidden text-lg font-black sm:inline">
            KitchCalc
          </span>
        </NuxtLink>
      </div>

      <div class="hidden items-center gap-6 md:flex">
        <a
          v-for="link in NAV_LINKS"
          :key="link.href"
          :href="link.href"
          class="text-muted-foreground hover:text-foreground focus-ring rounded text-sm font-medium transition-colors"
          :class="{ 'text-accent-text': isActive(link.href) }"
          :data-spy-active="isActive(link.href) ? '1' : undefined"
        >
          {{ link.label }}
        </a>
      </div>

      <div class="flex items-center gap-3">
        <LandingThemeToggle />
        <Button
          variant="primary"
          :href="isAuthenticated ? '/recipes' : '/sign-in'"
        >
          {{ isAuthenticated ? "Ir a la app" : "Comenzar gratis" }}
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
    <div
      id="landing-mobile-backdrop"
      class="bg-backdrop absolute inset-0 z-0"
      @click="closeMenu"
    />
    <div
      id="landing-mobile-panel"
      ref="menuPanel"
      tabindex="-1"
      class="border-border bg-card absolute top-0 left-0 isolate z-10 flex h-full w-72 flex-col border-r p-6 shadow-2xl outline-none"
    >
      <div class="flex items-center justify-between">
        <span class="text-foreground text-lg font-black">Menú</span>
        <button
          id="landing-mobile-menu-close"
          type="button"
          class="text-muted-foreground hover:text-foreground hover:bg-hover-muted focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors"
          aria-label="Cerrar menú"
          @click="closeMenu"
        >
          <Icon name="lucide:x" :size="20" />
        </button>
      </div>
      <nav class="mt-8 space-y-5">
        <a
          v-for="link in NAV_LINKS"
          :key="link.href"
          :href="link.href"
          class="text-foreground hover:text-accent-text focus-ring block rounded text-lg font-medium transition-colors"
          @click="closeMenu"
        >
          {{ link.label }}
        </a>
      </nav>
      <div class="mt-8">
        <LandingThemeToggle />
      </div>
    </div>
  </div>
</template>

<style>
#landing-mobile-menu {
  pointer-events: none;
}
#landing-mobile-menu[data-open="1"] {
  pointer-events: auto;
}
#landing-mobile-backdrop {
  opacity: 0;
  transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
#landing-mobile-menu[data-open="1"] #landing-mobile-backdrop {
  opacity: 1;
}
#landing-mobile-panel {
  transform: translateX(-100%);
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
#landing-mobile-menu[data-open="1"] #landing-mobile-panel {
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
