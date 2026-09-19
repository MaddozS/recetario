<script setup lang="ts">
import type { AppPage } from "#shared/types/navigation";

const props = defineProps<{
  currentPage: AppPage | null;
  collapsed?: boolean;
}>();

const emit = defineEmits<{ close: []; toggleCollapse: [] }>();

const { subscription, isAuthenticated, hasFeature } = useAuth();

const showProduction = computed(() => hasFeature("production_planner"));
const items = computed(() => visibleNavItems(showProduction.value));
const planLabel = computed(() => {
  const tier = subscription.value?.tier;
  if (tier === "basic") return "Basic";
  if (tier === "pro") return "Pro";
  return "Free";
});

const isCollapsed = computed(() => props.collapsed === true);
const isActive = (page: AppPage) => props.currentPage === page;

// Estado pendiente: el destino de la navegación en curso se marca en el mismo
// frame del click (lo escribe el plugin `nav-pending`).
const pending = useNavPending();
const isPending = (href: string) => matchesPendingHref(pending.value, href);
</script>

<template>
  <div class="bg-card relative flex h-full flex-col">
    <!-- Cabecera móvil: cerrar + plan (o marca si no hay sesión) -->
    <div
      class="border-border flex flex-none items-center gap-3 border-b p-4 md:hidden"
    >
      <button
        id="close-sidebar-btn"
        type="button"
        class="text-muted-foreground hover:text-secondary-foreground border-border hover:bg-background rounded-xl border p-2 transition-colors"
        aria-label="Cerrar menú"
        @click="emit('close')"
      >
        <Icon name="lucide:x" :size="20" />
      </button>
      <div v-if="isAuthenticated" class="flex items-center gap-3">
        <Badge variant="tier" color="accent">{{ planLabel }}</Badge>
      </div>
      <template v-else>
        <div
          class="bg-accent-solid text-text-on-accent shadow-accent-100 rounded-xl p-2 shadow-md"
        >
          <Icon name="lucide:chef-hat" :size="20" />
        </div>
        <p class="text-foreground text-base leading-tight font-bold">
          KitchCalc
        </p>
      </template>
    </div>

    <nav
      id="sidebar-nav"
      class="flex-1 space-y-1 overflow-y-auto px-3 pt-4 pb-2"
      aria-label="Secciones"
    >
      <NuxtLink
        v-for="item in items"
        :key="item.page"
        :to="item.href"
        :title="item.label"
        :data-pending="isPending(item.href) ? '1' : undefined"
        class="sidebar-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
        :class="[
          isActive(item.page) || isPending(item.href)
            ? 'bg-accent-solid text-text-on-accent'
            : 'text-muted-foreground hover:text-secondary-foreground hover:bg-muted',
          isPending(item.href) ? 'opacity-70' : '',
          isCollapsed ? 'md:justify-center md:gap-0 md:px-0' : '',
        ]"
        :aria-current="isActive(item.page) ? 'page' : undefined"
      >
        <Icon :name="item.icon" :size="20" class="shrink-0" />
        <span
          class="sidebar-label truncate"
          :class="isCollapsed ? 'md:w-0 md:overflow-hidden md:opacity-0' : ''"
        >
          {{ item.label }}
        </span>
      </NuxtLink>
    </nav>

    <!-- Pie de sidebar (escritorio): plan + colapso -->
    <div class="border-border hidden border-t md:block">
      <div class="flex items-center justify-between p-3">
        <div class="flex items-center gap-2">
          <Badge v-if="!isCollapsed" variant="tier" color="accent">
            {{ planLabel }}
          </Badge>
        </div>
        <button
          id="sidebar-collapse-toggle"
          type="button"
          class="text-subtle-foreground hover:text-secondary-foreground hover:bg-muted inline-flex h-11 min-h-11 w-11 min-w-11 shrink-0 items-center justify-center rounded-lg transition-colors"
          :class="isCollapsed ? 'md:mx-auto' : ''"
          :aria-label="isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'"
          :title="isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'"
          @click="emit('toggleCollapse')"
        >
          <Icon v-if="isCollapsed" name="lucide:chevron-right" :size="18" />
          <Icon v-else name="lucide:chevron-left" :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>
