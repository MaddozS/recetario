<script setup lang="ts">
import type { AppPage } from '#shared/types/navigation';

const props = defineProps<{
  currentPage: AppPage | null;
  showProduction: boolean;
}>();

const items = computed(() => visibleNavItems(props.showProduction));
const isActive = (page: AppPage) => props.currentPage === page;

// Estado pendiente: el destino de la navegación en curso se marca en el mismo
// frame del click (lo escribe el plugin `nav-pending`).
const pending = useNavPending();
const isPending = (href: string) => matchesPendingHref(pending.value, href);
</script>

<template>
  <nav
    id="bottom-nav"
    class="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] md:hidden"
    aria-label="Secciones"
  >
    <div
      class="border-border bg-card gap-1 rounded-2xl border p-1 shadow-[0_-8px_24px_var(--tw-shadow-color,rgba(0,0,0,0.08))] sm:p-1.5 dark:shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
      :class="showProduction ? 'grid grid-cols-4' : 'grid grid-cols-3'"
    >
      <NuxtLink
        v-for="item in items"
        :key="item.page"
        :to="item.href"
        :data-pending="isPending(item.href) ? '1' : undefined"
        class="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition-colors sm:text-xs"
        :class="[
          isActive(item.page) || isPending(item.href)
            ? 'bg-accent-solid text-text-on-accent'
            : 'text-muted-foreground hover:bg-muted',
          isPending(item.href) ? 'opacity-70' : '',
        ]"
        :aria-current="isActive(item.page) ? 'page' : undefined"
      >
        <Icon :name="item.icon" :size="16" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
