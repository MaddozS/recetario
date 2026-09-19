<script setup lang="ts">
import type {
  IngredientRecord,
  IngredientRow,
  RecipeDetailRecord,
} from "./recipe-detail-form";
import RecipeIngredientEditor from "./RecipeIngredientEditor.vue";
import RecipeIngredientView from "./RecipeIngredientView.vue";

/**
 * Card de la lista de ingredientes: cabecera con «Ver notas», y la vista
 * (cards/tabla) o el editor según el modo. El estado de edición lo gobierna el
 * coordinador; aquí sólo se compone.
 */
withDefaults(
  defineProps<{
    editMode: boolean;
    showComments: boolean;
    multiplier: number;
    viewIngredients: ReadonlyArray<RecipeDetailRecord["ingredients"][number]>;
    rows: ReadonlyArray<IngredientRow>;
    ingredients: ReadonlyArray<IngredientRecord>;
    unitOptions: ReadonlyArray<string>;
    invalidKeys?: ReadonlyArray<string>;
    addRow: () => void;
    removeRow: (index: number) => void;
    patchRow: (
      index: number,
      patch: Partial<Omit<IngredientRow, "key">>,
    ) => void;
  }>(),
  { invalidKeys: () => [] },
);

const emit = defineEmits<{ toggleComments: [visible: boolean] }>();

function onToggleComments(event: Event): void {
  emit("toggleComments", (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <Card class="overflow-visible p-0!">
    <div
      class="border-border-light bg-card flex items-center justify-between border-b px-5 py-5 sm:px-6 lg:px-8"
    >
      <h2 class="text-foreground text-sm font-bold">Lista de Ingredientes</h2>
      <label
        class="text-muted-foreground bg-background border-border hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors"
        :class="editMode ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'"
      >
        <input
          id="toggle-comments"
          type="checkbox"
          class="border-border text-accent-600 focus:ring-accent-500 h-4 w-4 rounded"
          :checked="showComments"
          :disabled="editMode"
          @change="onToggleComments"
        />
        <span class="text-secondary-foreground font-semibold">Ver notas</span>
      </label>
    </div>

    <div v-if="editMode" class="px-5 py-5 sm:px-6 lg:px-8">
      <RecipeIngredientEditor
        :rows="rows"
        :ingredients="ingredients"
        :unit-options="unitOptions"
        :invalid-keys="invalidKeys"
        :add-row="addRow"
        :remove-row="removeRow"
        :patch-row="patchRow"
      />
    </div>

    <RecipeIngredientView
      v-else
      :ingredients="viewIngredients"
      :multiplier="multiplier"
      :show-comments="showComments"
    />
  </Card>
</template>
