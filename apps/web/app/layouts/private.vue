<script setup lang="ts">
import { breadcrumbsWithTail } from "#shared/utils/navigation";
import type { BreadcrumbItem } from "#shared/types/navigation";

/**
 * Shell autenticado. Sustituye a `Layout` sin su maquinaria imperativa:
 * el drawer, el colapso y el estado activo son estado reactivo; el progreso de
 * navegación lo aporta `useLoadingIndicator`.
 */

const route = useRoute();
const { hasFeature } = useAuth();

const currentPage = computed(() => pageKeyFromPath(route.path));
const breadcrumbTail = useBreadcrumbTailState();
const breadcrumbs = computed<BreadcrumbItem[]>(() =>
  breadcrumbsWithTail(
    route.meta.breadcrumbs ?? [],
    breadcrumbTail.value,
    route.path,
  ),
);
const showSidebar = computed(() => route.meta.sidebar !== false);
const showProduction = computed(() => hasFeature("production_planner"));

const sidebarOpen = ref(false);
const { collapsed, setCollapsed } = useSidebarCollapsed();

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    sidebarOpen.value = false;
  }
}

watch(sidebarOpen, (open) => {
  if (!import.meta.client) return;
  document.body.style.overflow = open ? "hidden" : "";
});

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false;
  },
);

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

// Rutas privadas: fuera de índices y sin caché compartida (el header lo fija
// `routeRules` en `nuxt.config.ts`).
useHead({
  bodyAttrs: {
    class: "bg-background flex flex-col min-h-dvh md:h-dvh md:overflow-hidden",
  },
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>

<template>
  <div class="flex flex-1 flex-col md:h-dvh md:overflow-hidden">
    <a
      href="#main-content"
      class="focus:bg-accent-solid focus:text-text-on-accent sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded-xl focus:px-4 focus:py-2 focus:outline-none"
    >
      Saltar al contenido
    </a>

    <AppHeader
      :breadcrumbs="breadcrumbs"
      :show-menu-button="showSidebar"
      @open-sidebar="sidebarOpen = true"
    />

    <div class="relative flex flex-1 flex-col overflow-hidden md:flex-row">
      <template v-if="showSidebar">
        <div
          id="mobile-sidebar-overlay"
          class="bg-backdrop/40 fixed inset-0 z-50 backdrop-blur-sm transition-opacity duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden"
          :class="sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'"
          aria-hidden="true"
          @click="sidebarOpen = false"
        />

        <aside
          id="app-sidebar"
          :data-collapsed="collapsed ? '1' : '0'"
          class="bg-card border-border fixed inset-y-0 left-0 z-60 w-[85%] max-w-[320px] shadow-2xl transition-[transform,width] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:flex md:max-w-none md:flex-none md:flex-col md:border-r md:shadow-none"
          :class="[
            // En escritorio la sidebar es fija: el `-translate-x-full` del
            // drawer móvil se neutraliza con `md:translate-x-0`.
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full md:translate-x-0',
            collapsed ? 'md:w-16' : 'md:w-[220px]',
          ]"
        >
          <AppSidebar
            :current-page="currentPage"
            :collapsed="collapsed"
            @close="sidebarOpen = false"
            @toggle-collapse="setCollapsed(!collapsed)"
          />
        </aside>
      </template>

      <main
        id="main-content"
        class="bg-background w-full flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8"
      >
        <div class="mx-auto max-w-7xl">
          <slot />
        </div>
      </main>
    </div>

    <AppBottomNav
      v-if="currentPage !== null"
      :current-page="currentPage"
      :show-production="showProduction"
    />

    <AppLoadingOverlay />
  </div>
</template>
