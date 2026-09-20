<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

/**
 * Navbar del landing. El drawer móvil, el bloqueo de scroll, el cierre con
 * Escape y el scroll-spy son estado Vue con cleanup; no hay globals ni
 * listeners manuales.
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

function openMenu(): void {
  menuOpen.value = true;
}

function closeMenu(): void {
  menuOpen.value = false;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") closeMenu();
}

watch(menuOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : "";
});

watch(
  () => route.fullPath,
  () => closeMenu(),
);

onMounted(() => document.addEventListener("keydown", onKeydown));

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
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
          type="button"
          class="text-muted-foreground hover:text-foreground hover:bg-hover-muted inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors md:hidden"
          aria-label="Abrir menú"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          @click="openMenu"
        >
          <Icon name="lucide:menu" :size="20" />
        </button>
        <NuxtLink to="/" class="flex shrink-0 items-center gap-2.5">
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
          class="text-muted-foreground hover:text-foreground focus-visible:ring-accent-500 rounded text-sm font-medium transition-colors focus-visible:ring-2"
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
    class="fixed inset-0 z-10000 md:hidden"
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
      class="border-border bg-card absolute top-0 left-0 isolate z-10 flex h-full w-72 flex-col border-r p-6 shadow-2xl"
    >
      <div class="flex items-center justify-between">
        <span class="text-foreground text-lg font-black">Menú</span>
        <button
          id="landing-mobile-menu-close"
          type="button"
          class="text-muted-foreground hover:text-foreground hover:bg-hover-muted inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors"
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
          class="text-foreground hover:text-accent-text focus-visible:ring-accent-500 block rounded text-lg font-medium transition-colors focus-visible:ring-2"
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
