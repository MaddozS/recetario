<script setup lang="ts">
import { toggleCategory } from "~/features/recipes/recipe-filters";
import type { RecipeCategoryOption } from "~/features/recipes/recipe-filters";

/**
 * Cabecera del listado: título, búsqueda, botón de crear y pills de categoría.
 * Las pills reflejan `?category=` (no estado local), así que el back/forward y
 * el deep link quedan cubiertos por el router.
 */
const props = defineProps<{
  category: string | null;
  categories: RecipeCategoryOption[];
  uncategorizedCount: number;
}>();

const emit = defineEmits<{
  create: [];
  selectCategory: [value: string | null];
}>();

const search = defineModel<string>("search", { required: true });

const BASE_PILL =
  "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors";

const SEARCH_INPUT_CLASSES =
  "bg-background border-border focus:ring-accent-500/20 focus:border-accent-500 placeholder:text-subtle-foreground w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm transition-colors focus:outline-none focus:ring-2";

function isActive(value: string): boolean {
  return props.category === value;
}

function pillClasses(value: string): string[] {
  if (isActive(value)) return [BASE_PILL, "bg-accent-600 text-white"];

  return [
    BASE_PILL,
    value === ""
      ? "bg-muted text-muted-foreground hover:bg-border border border-border"
      : "bg-accent-50 text-accent-600 hover:bg-accent-100 border border-accent-200",
  ];
}

function countClasses(value: string): string[] {
  const base =
    "inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold";

  if (isActive(value)) return [base, "bg-accent-500 text-white"];

  return [
    base,
    value === ""
      ? "bg-border text-subtle-foreground"
      : "bg-accent-200/50 text-accent-700",
  ];
}

function select(value: string): void {
  emit("selectCategory", toggleCategory(props.category, value));
}
</script>

<template>
  <div>
    <div class="mb-3 flex items-end justify-between gap-3">
      <h2
        class="text-muted-foreground text-sm font-bold tracking-[0.12em] uppercase"
      >
        Recetas
      </h2>
    </div>

    <div class="mb-3 flex items-center gap-2">
      <div class="relative flex-1">
        <label for="recipeSearch" class="sr-only">Buscar receta</label>
        <Icon
          name="lucide:search"
          :size="18"
          class="text-subtle-foreground absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <input
          id="recipeSearch"
          v-model="search"
          type="search"
          placeholder="Buscar receta..."
          :class="SEARCH_INPUT_CLASSES"
        />
      </div>

      <Button
        variant="primary"
        icon="plus"
        aria-label="Nueva Receta"
        class="shrink-0"
        @click="emit('create')"
      >
        <span class="hidden sm:inline">Nueva Receta</span>
      </Button>
    </div>

    <div
      class="flex scrollbar-thin items-center gap-2 overflow-x-auto pb-3 [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-visible"
    >
      <button
        v-for="option in categories"
        :key="option.value"
        type="button"
        :class="pillClasses(option.value)"
        @click="select(option.value)"
      >
        {{ option.value }}
        <span :class="countClasses(option.value)">{{ option.count }}</span>
      </button>

      <button
        v-if="uncategorizedCount > 0"
        type="button"
        :class="pillClasses('')"
        @click="select('')"
      >
        Sin categoría
        <span :class="countClasses('')">{{ uncategorizedCount }}</span>
      </button>

      <button
        v-if="category !== null"
        type="button"
        class="border-border bg-card text-muted-foreground hover:bg-background inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
        @click="emit('selectCategory', null)"
      >
        <Icon name="lucide:x" :size="12" />
        Limpiar filtro
      </button>
    </div>
  </div>
</template>
