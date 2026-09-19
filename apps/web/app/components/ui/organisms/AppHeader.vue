<script setup lang="ts">
import type { BreadcrumbItem } from "#shared/types/navigation";

const props = defineProps<{
  breadcrumbs?: BreadcrumbItem[];
  showMenuButton?: boolean;
}>();

const emit = defineEmits<{ openSidebar: [] }>();
const { isAuthenticated } = useAuth();

// Con migas, el logo y el título dejan sitio en móvil (paridad con el baseline).
const hasBreadcrumbs = computed(() => (props.breadcrumbs?.length ?? 0) > 0);
</script>

<template>
  <header
    class="bg-card border-border relative z-10 flex flex-none items-center gap-3 border-b px-4 py-3 md:gap-4 md:px-6 md:py-4"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
      <button
        v-if="showMenuButton"
        id="mobile-menu-btn"
        type="button"
        class="text-muted-foreground hover:text-secondary-foreground border-border hover:bg-background inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border p-2 transition-colors md:hidden"
        aria-label="Abrir menú"
        @click="emit('openSidebar')"
      >
        <Icon name="lucide:menu" :size="20" />
      </button>

      <img
        src="/kitchcalc_logo.svg"
        alt="KitchCalc"
        class="shadow-accent-100 h-9 w-9 rounded-xl shadow-md sm:h-10 sm:w-10"
        :class="hasBreadcrumbs ? 'hidden md:block' : ''"
      />
      <h1
        class="text-foreground text-lg leading-tight font-bold sm:text-xl"
        :class="hasBreadcrumbs ? 'hidden md:block' : ''"
      >
        KitchCalc
      </h1>

      <div
        v-if="hasBreadcrumbs"
        class="bg-border hidden h-6 w-px md:block"
        aria-hidden="true"
      />

      <AppBreadcrumbs :items="breadcrumbs ?? []" />
    </div>

    <div
      v-if="isAuthenticated"
      class="ml-auto flex shrink-0 items-center justify-end gap-2 sm:gap-3"
    >
      <SignOutButton />
    </div>
  </header>
</template>
