<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Menú de acciones de una receta. Sustituye al listener delegado de
 * `recipe-actions.ts` + los `data-*` de Astro por estado Vue local: cada menú
 * gestiona su propio `open` y se cierra al hacer click fuera (con cleanup).
 *
 * Dos variantes: `card` (el menú de una tarjeta del listado, anclado arriba a la
 * derecha) y `page` (el del detalle, anclado bajo el trigger). En la card
 * «Editar» es un enlace a `?edit=true`; en la página emite `edit` para que el
 * detalle active el modo edición sin navegar.
 *
 * A11y: Escape cierra y devuelve el foco al trigger, abrir enfoca el primer
 * ítem y las flechas recorren el menú.
 */
const props = withDefaults(
  defineProps<{
    recipeId: number;
    canDuplicate?: boolean;
    canDelete?: boolean;
    variant?: "card" | "page";
  }>(),
  { canDuplicate: false, canDelete: true, variant: "card" },
);

const emit = defineEmits<{ edit: []; duplicate: []; delete: [] }>();

const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const open = ref(false);

const isPage = () => props.variant === "page";

function menuItems(): HTMLElement[] {
  return panel.value
    ? Array.from(panel.value.querySelectorAll<HTMLElement>("[role='menuitem']"))
    : [];
}

async function openMenu(): Promise<void> {
  open.value = true;
  await nextTick();
  menuItems()[0]?.focus();
}

function close(restoreFocus = false): void {
  open.value = false;
  if (restoreFocus) trigger.value?.focus();
}

async function toggle(): Promise<void> {
  if (open.value) {
    close();
    return;
  }

  await openMenu();
}

function onEdit(): void {
  close();
  emit("edit");
}

function onDuplicate(): void {
  close();
  emit("duplicate");
}

function onDelete(): void {
  close();
  emit("delete");
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    close(true);
    return;
  }

  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

  const items = menuItems();
  if (items.length === 0) return;

  event.preventDefault();
  const current = items.indexOf(document.activeElement as HTMLElement);
  const next =
    event.key === "ArrowDown"
      ? (current + 1) % items.length
      : (current - 1 + items.length) % items.length;
  items[next]?.focus();
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
  <div
    ref="root"
    :class="isPage() ? 'relative' : 'contents'"
    @keydown="onKeydown"
  >
    <button
      ref="trigger"
      type="button"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="true"
      :aria-label="isPage() ? 'Opciones de receta' : 'Acciones'"
      class="focus-visible:ring-accent-500 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center transition-all focus:outline-none focus-visible:ring-2"
      :class="
        isPage()
          ? 'border-border bg-card hover:bg-muted rounded-xl border'
          : 'text-subtle-foreground hover:bg-muted hover:text-secondary-foreground absolute top-3 right-3 z-10 rounded-lg'
      "
      @click="toggle"
      @keydown.down.prevent="openMenu()"
    >
      <Icon name="lucide:ellipsis-vertical" :size="isPage() ? 18 : 16" />
    </button>

    <div
      :id="`recipe-menu-${props.recipeId}`"
      ref="panel"
      role="menu"
      class="border-border bg-card z-30 min-w-40 rounded-xl border p-1 shadow-lg transition-[opacity,scale] duration-150 ease-[var(--ease-out)]"
      :class="[
        isPage() ? 'absolute top-full right-0 mt-1' : 'absolute top-11 right-3',
        open
          ? 'pointer-events-auto visible scale-100 opacity-100'
          : 'pointer-events-none invisible scale-95 opacity-0',
      ]"
    >
      <button
        v-if="isPage()"
        type="button"
        role="menuitem"
        :class="[
          MENU_ITEM_CLASSES,
          'text-muted-foreground hover:bg-accent-50 hover:text-accent-600',
        ]"
        @click="onEdit"
      >
        <Icon name="lucide:pencil" :size="16" /> Editar
      </button>
      <NuxtLink
        v-else
        :to="`/recipes/${props.recipeId}?edit=true`"
        role="menuitem"
        :class="[
          MENU_ITEM_CLASSES,
          'text-muted-foreground hover:bg-accent-50 hover:text-accent-600',
        ]"
        @click="close()"
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
        v-if="props.canDelete"
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
