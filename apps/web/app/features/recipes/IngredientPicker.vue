<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { normalizeSearchText } from "#shared/utils/search";
import { formatIngredientLabel } from "./recipe-detail-form";
import type { IngredientRecord } from "./recipe-detail-form";

/**
 * Selector de ingrediente de una fila del editor.
 *
 * Sustituye al `<select>` oculto + input + dropdown con delegación de eventos del
 * baseline: aquí el texto, el filtro y el panel son estado del componente, así
 * que el `<select>` no puede quedar desincronizado del texto (el motivo del
 * *fallback* «adivinar por nombre al enviar» de Astro, que desaparece).
 *
 * El filtro normaliza con NFD, igual que el resto de búsquedas.
 */
const props = defineProps<{
  ingredients: ReadonlyArray<IngredientRecord>;
  /** Texto visible actual del ingrediente elegido (vacío si no hay). */
  label: string;
}>();

const emit = defineEmits<{
  pick: [ingredient: IngredientRecord];
  clear: [];
}>();

const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const query = ref(props.label);
const open = ref(false);

watch(
  () => props.label,
  (label) => {
    query.value = label;
  },
);

const matches = computed(() => {
  const needle = normalizeSearchText(query.value);
  if (!needle) return props.ingredients;
  return props.ingredients.filter((ingredient) =>
    normalizeSearchText(formatIngredientLabel(ingredient)).includes(needle),
  );
});

const hasText = computed(() => query.value.trim().length > 0);

function openDropdown(): void {
  open.value = true;
}

function closeDropdown(): void {
  open.value = false;
}

function onPick(ingredient: IngredientRecord): void {
  emit("pick", ingredient);
  query.value = formatIngredientLabel(ingredient);
  closeDropdown();
}

function onClear(): void {
  emit("clear");
  query.value = "";
  open.value = false;
  input.value?.focus();
}

function onDocumentClick(event: MouseEvent): void {
  if (!open.value) return;

  const target = event.target as Node | null;
  if (target && root.value?.contains(target)) return;

  closeDropdown();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    closeDropdown();
  }
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));
</script>

<template>
  <div ref="root" class="relative" data-ingredient-picker>
    <div class="relative">
      <input
        ref="input"
        v-model="query"
        type="text"
        placeholder="Buscar..."
        autocomplete="off"
        class="ingredient-search-input bg-card md:bg-background border-border text-secondary-foreground focus:ring-accent-500/20 placeholder:text-muted-foreground w-full rounded-xl border p-2 pr-8 pl-9 text-sm font-semibold focus:ring-2"
        @focus="openDropdown"
        @input="openDropdown"
        @keydown="onKeydown"
      />
      <svg
        class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <button
        v-if="hasText"
        type="button"
        aria-label="Limpiar"
        class="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
        @click="onClear"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-muted-foreground"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>

    <div
      v-if="open && matches.length > 0"
      class="ingredient-dropdown bg-card border-border absolute right-0 left-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-lg"
    >
      <button
        v-for="ingredient in matches"
        :key="ingredient.id"
        type="button"
        class="ingredient-option text-secondary-foreground hover:bg-accent-50 hover:text-accent-600 flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors"
        :data-value="ingredient.id"
        :data-unit="ingredient.unit"
        @click="onPick(ingredient)"
      >
        <span class="font-medium">{{ ingredient.name }}</span>
        <span v-if="ingredient.brand" class="text-subtle-foreground text-xs">
          ({{ ingredient.brand }})
        </span>
      </button>
    </div>
  </div>
</template>
