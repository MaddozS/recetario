<script setup lang="ts">
import type { BreadcrumbItem } from "#shared/types/navigation";

const props = defineProps<{ items: BreadcrumbItem[] }>();

const currentLabel = computed(
  () => props.items[props.items.length - 1]?.label ?? "",
);
const parentItem = computed(() =>
  props.items.length >= 2 ? props.items[props.items.length - 2] : null,
);
</script>

<template>
  <!-- Móvil: padre + actual, o sólo el actual en páginas de primer nivel -->
  <nav
    data-variant="mobile"
    aria-label="Breadcrumb"
    class="flex min-w-0 items-center gap-1 md:hidden"
  >
    <template v-if="parentItem">
      <NuxtLink
        v-if="parentItem.href"
        :to="parentItem.href"
        class="text-muted-foreground hover:text-secondary-foreground flex min-h-11 items-center text-sm font-medium transition-colors"
      >
        <span class="truncate">{{ parentItem.label }}</span>
      </NuxtLink>
      <span
        v-else
        class="text-muted-foreground flex min-h-11 items-center text-sm font-medium"
      >
        <span class="truncate">{{ parentItem.label }}</span>
      </span>
      <Icon
        name="lucide:chevron-right"
        :size="14"
        class="text-accent-600 shrink-0"
        aria-hidden="true"
      />
    </template>
    <span class="text-foreground flex min-h-11 items-center truncate text-sm font-semibold">
      {{ currentLabel }}
    </span>
  </nav>

  <!-- Escritorio: recorrido completo -->
  <nav
    v-if="items.length > 0"
    data-variant="desktop"
    aria-label="Breadcrumb"
    class="hidden min-w-0 items-center gap-1.5 text-sm md:flex"
  >
    <Icon
      name="lucide:folder-open"
      :size="16"
      class="text-accent-600 shrink-0 opacity-70"
      aria-hidden="true"
    />
    <template v-for="(item, index) in items" :key="`${item.label}-${index}`">
      <Icon
        v-if="index > 0"
        name="lucide:chevron-right"
        :size="16"
        class="text-accent-600 shrink-0"
        aria-hidden="true"
      />
      <NuxtLink
        v-if="item.href"
        :to="item.href"
        class="text-muted-foreground hover:text-secondary-foreground font-medium whitespace-nowrap transition-colors"
      >
        {{ item.label }}
      </NuxtLink>
      <span v-else class="text-foreground max-w-50 truncate font-semibold">
        {{ item.label }}
      </span>
    </template>
  </nav>
</template>
