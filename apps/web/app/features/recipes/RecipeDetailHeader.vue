<script setup lang="ts">
import RecipeActionsMenu from './RecipeActionsMenu.vue';
import RecipeMultiplier from './RecipeMultiplier.vue';

/**
 * Cabecera del detalle: título y categoría (vista/edición), badge de categoría
 * con la última modificación, barra de guardado y el multiplicador (dos
 * posiciones: fila propia en móvil, junto al menú en escritorio; el mismo
 * estado controlado en ambas).
 */
defineProps<{
  recipeId: number;
  name: string;
  /** Valor editable del formulario (input de categoría). */
  category: string;
  /** Categoría guardada: la del badge, como en el baseline (no cambia al teclear). */
  savedCategory: string;
  editMode: boolean;
  saving: boolean;
  updatedText: string;
  multiplier: number;
  canDuplicate: boolean;
}>();

const emit = defineEmits<{
  'update:name': [value: string];
  'update:category': [value: string];
  save: [];
  cancel: [];
  edit: [];
  duplicate: [];
  delete: [];
  multiplier: [value: number];
}>();
</script>

<template>
  <div>
    <!-- Fila 1: título + acciones -->
    <div class="flex items-start justify-between gap-3 pb-3">
      <div class="flex-1">
        <h1
          v-if="!editMode"
          id="recipe-title-view"
          class="text-foreground text-3xl leading-tight font-black sm:text-4xl"
        >
          {{ name }}
        </h1>
        <div v-else>
          <input
            id="recipe-name-input"
            type="text"
            name="recipeName"
            class="text-foreground bg-background border-border focus:ring-accent-500/20 w-full rounded-xl border p-2 text-3xl leading-tight font-black focus:ring-2 sm:text-4xl"
            :value="name"
            @input="emit('update:name', ($event.target as HTMLInputElement).value)"
          />
          <div class="mt-2">
            <input
              type="text"
              name="category"
              class="bg-background border-border text-secondary-foreground focus:ring-accent-500/20 w-full max-w-xs rounded-xl border p-2 text-sm focus:ring-2"
              placeholder="Categoría (ej. Panes, Galletas, Pasteles)"
              :value="category"
              @input="emit('update:category', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <div v-if="!editMode" class="flex items-center gap-2">
        <div class="hidden sm:block" data-multiplier="desktop">
          <RecipeMultiplier :multiplier="multiplier" @change="emit('multiplier', $event)" />
        </div>
        <RecipeActionsMenu
          variant="page"
          :recipe-id="recipeId"
          :can-duplicate="canDuplicate"
          :can-delete="true"
          @edit="emit('edit')"
          @duplicate="emit('duplicate')"
          @delete="emit('delete')"
        />
      </div>
    </div>

    <!-- Fila 2: badge + última modificación, y barra de guardado -->
    <div class="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="text-muted-foreground flex items-center gap-3 text-sm font-medium">
        <Badge
          variant="category"
          color="accent"
          class="gap-1.5 px-3 py-1 font-black tracking-wider uppercase"
        >
          <Icon name="lucide:tag" :size="12" />
          {{ savedCategory || 'Sin categoría' }}
        </Badge>
        <span v-if="updatedText" class="text-subtle-foreground text-xs font-semibold">
          Actualizado {{ updatedText }}
        </span>
      </div>

      <div v-if="editMode" class="flex items-center gap-2 self-end">
        <Button
          variant="primary"
          icon="save"
          type="button"
          size="sm"
          :loading="saving"
          @click="emit('save')"
        >
          Guardar Receta
        </Button>
        <Button
          id="recipe-cancel-edit"
          variant="ghost"
          icon="x"
          type="button"
          size="sm"
          @click="emit('cancel')"
        >
          Cancelar
        </Button>
      </div>
    </div>

    <!-- Fila 1b: multiplicador en móvil -->
    <div v-if="!editMode" class="mb-4 sm:hidden" data-multiplier="mobile">
      <RecipeMultiplier :multiplier="multiplier" @change="emit('multiplier', $event)" />
    </div>
  </div>
</template>
