<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Menú de acciones de una card de receta. Sustituye al listener delegado de
 * `recipe-actions.ts` + los `data-*` de Astro por estado Vue local: cada menú
 * gestiona su propio `open` y se cierra al hacer click fuera (con cleanup).
 *
 * Editar es un enlace (navegación cliente a `?edit=true`); Duplicar y Eliminar
 * delegan en el padre, que es quien tiene la mutación y el dialog.
 */
const props = defineProps<{
  recipeId: number;
  canDuplicate: boolean;
}>();

const emit = defineEmits<{ duplicate: []; delete: [] }>();

const root = ref<HTMLElement | null>(null);
const open = ref(false);

function close(): void {
  open.value = false;
}

function toggle(): void {
  open.value = !open.value;
}

function onDuplicate(): void {
  close();
  emit("duplicate");
}

function onDelete(): void {
  close();
  emit("delete");
}

/**
 * El listener vive en `document` para cerrar al click fuera. El click del
 * trigger burbujea después de su propio handler, así que `contains` lo deja
 * pasar sin cerrar el menú recién abierto.
 */
function onDocumentClick(event: MouseEvent): void {
  if (!open.value) return;

  const target = event.target as Node | null;
  if (target && root.value?.contains(target)) return;

  close();
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));

const MENU_ITEM_CLASSES =
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
</script>

<template>
  <div ref="root" class="contents">
    <button
      type="button"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="true"
      aria-label="Acciones"
      class="text-subtle-foreground hover:bg-muted hover:text-secondary-foreground focus-visible:ring-accent-500 absolute top-3 right-3 z-10 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg transition-all focus:outline-none focus-visible:ring-2"
      @click="toggle"
    >
      <Icon name="lucide:ellipsis-vertical" :size="16" />
    </button>

    <div
      :id="`recipe-menu-${props.recipeId}`"
      role="menu"
      class="border-border bg-card absolute top-11 right-3 z-30 min-w-40 rounded-xl border p-1 shadow-lg transition-[opacity,scale] duration-150 ease-[var(--ease-out)]"
      :class="
        open
          ? 'pointer-events-auto visible scale-100 opacity-100'
          : 'pointer-events-none invisible scale-95 opacity-0'
      "
    >
      <NuxtLink
        :to="`/recipes/${props.recipeId}?edit=true`"
        role="menuitem"
        :class="[
          MENU_ITEM_CLASSES,
          'text-muted-foreground hover:bg-accent-50 hover:text-accent-600',
        ]"
        @click="close"
      >
        <Icon name="lucide:pencil" :size="16" /> Editar
      </NuxtLink>

      <button
        v-if="props.canDuplicate"
        type="button"
        role="menuitem"
        :class="[
          MENU_ITEM_CLASSES,
          'text-muted-foreground hover:bg-accent-50 hover:text-accent-600',
        ]"
        @click="onDuplicate"
      >
        <Icon name="lucide:copy" :size="16" /> Duplicar
      </button>

      <button
        type="button"
        role="menuitem"
        :class="[MENU_ITEM_CLASSES, 'text-danger hover:bg-danger-bg']"
        @click="onDelete"
      >
        <Icon name="lucide:trash-2" :size="16" /> Eliminar
      </button>
    </div>
  </div>
</template>
