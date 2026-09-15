<script setup lang="ts">
import type { IngredientRecord } from "~/features/ingredients/ingredient-state";
import { computed } from "vue";
import { formatUnitCost } from "~/features/ingredients/ingredient-form";

/**
 * Lista de ingredientes: cabecera con búsqueda, tabla de 6 columnas (la misma
 * en móvil, con scroll horizontal) y estados vacío / sin resultados.
 */
const props = defineProps<{
  ingredients: IngredientRecord[];
  total: number;
  usage: Record<string, string[]>;
}>();

const emit = defineEmits<{
  create: [];
  edit: [ingredient: IngredientRecord];
  delete: [ingredient: IngredientRecord];
}>();

const search = defineModel<string>("search", { required: true });

const isSearching = computed(() => search.value.trim().length > 0);
const showSearchEmpty = computed(
  () => isSearching.value && props.ingredients.length === 0,
);

const SEARCH_INPUT_CLASSES =
  "w-full rounded-xl border border-border bg-background py-3 pr-4 pl-11 text-sm text-foreground outline-none transition placeholder:text-subtle-foreground focus:border-accent-300 focus:bg-card focus:ring-2 focus:ring-accent-500/20";

function usedRecipesFor(ingredient: IngredientRecord): string[] {
  return props.usage[String(ingredient.id)] ?? [];
}
</script>

<template>
  <Card class="overflow-hidden p-0!">
    <div class="border-border border-b px-4 py-4 sm:px-6">
      <div
        class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div class="flex items-baseline gap-2">
            <h2 class="text-foreground text-xl font-black">Tus Ingredientes</h2>
            <span class="text-subtle-foreground text-sm font-semibold">
              ({{ total }})
            </span>
          </div>
          <p class="text-muted-foreground mt-1 text-sm">
            Busca por ingrediente, proveedor o marca.
          </p>
        </div>

        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end"
        >
          <Button
            variant="primary"
            icon="plus"
            class="lg:hidden"
            @click="emit('create')"
          >
            Agregar Insumo
          </Button>

          <label class="relative block w-full sm:w-80">
            <span class="sr-only">Buscar ingrediente</span>
            <span
              class="text-subtle-foreground pointer-events-none absolute inset-y-0 left-4 flex items-center"
            >
              <Icon name="lucide:search" :size="16" />
            </span>
            <input
              v-model="search"
              type="search"
              placeholder="Buscar ingrediente o proveedor..."
              :class="SEARCH_INPUT_CLASSES"
            />
          </label>
        </div>
      </div>
    </div>

    <template v-if="total > 0">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left">
          <thead
            class="bg-background text-muted-foreground text-[11px] font-bold tracking-[0.16em] uppercase"
          >
            <tr>
              <th class="px-6 py-4">Insumo</th>
              <th class="px-6 py-4">Proveedor</th>
              <th class="px-6 py-4">Precio Empaque</th>
              <th class="px-6 py-4">Contenido</th>
              <th class="px-6 py-4">Costo x Unidad</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-border-light divide-y">
            <tr
              v-for="ingredient in ingredients"
              :key="ingredient.id"
              class="hover:bg-hover-muted dark:hover:bg-hover-muted transition-colors"
            >
              <td class="px-6 py-5">
                <div class="min-w-56">
                  <p class="text-foreground font-semibold">
                    {{ ingredient.name }}
                  </p>
                  <p
                    v-if="ingredient.brand"
                    class="text-subtle-foreground mt-1 text-xs"
                  >
                    Marca: {{ ingredient.brand }}
                  </p>
                </div>
              </td>
              <td class="px-6 py-5">
                <span
                  v-if="ingredient.supplier"
                  class="text-secondary-foreground text-sm font-medium"
                >
                  {{ ingredient.supplier }}
                </span>
                <span v-else class="text-subtle-foreground text-sm italic">
                  Sin proveedor
                </span>
              </td>
              <td class="px-6 py-5">
                <span
                  class="text-secondary-foreground font-mono text-sm font-semibold tabular-nums"
                >
                  ${{ ingredient.price.toFixed(2) }}
                </span>
              </td>
              <td class="text-muted-foreground px-6 py-5 text-sm">
                <span class="text-secondary-foreground font-mono font-semibold">
                  {{ ingredient.purchaseQuantity }}
                </span>
                <span> {{ ingredient.unit }}</span>
              </td>
              <td class="px-6 py-5">
                <span
                  class="border-accent-100 bg-accent-50 text-accent-600 inline-flex items-center rounded-xl border px-3 py-2 font-mono text-sm font-semibold tabular-nums"
                >
                  {{
                    formatUnitCost(
                      ingredient.price,
                      ingredient.purchaseQuantity,
                    )
                  }}
                  / {{ ingredient.unit }}
                </span>
              </td>
              <td class="px-6 py-5 text-right">
                <div class="flex items-center justify-end gap-2">
                  <Button
                    variant="iconAccent"
                    icon-only
                    icon="pencil"
                    aria-label="Editar ingrediente"
                    @click="emit('edit', ingredient)"
                  />

                  <Button
                    variant="iconDanger"
                    icon-only
                    icon="trash-2"
                    :title="
                      usedRecipesFor(ingredient).length > 0
                        ? 'Ingrediente en uso'
                        : 'Eliminar ingrediente'
                    "
                    :aria-label="
                      usedRecipesFor(ingredient).length > 0
                        ? 'Ingrediente en uso'
                        : 'Eliminar ingrediente'
                    "
                    @click="emit('delete', ingredient)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="showSearchEmpty"
        class="border-border-light border-t px-6 py-10 text-center"
      >
        <div class="mx-auto flex max-w-sm flex-col items-center">
          <div
            class="bg-muted text-subtle-foreground flex h-12 w-12 items-center justify-center rounded-2xl"
          >
            <Icon name="lucide:search-x" :size="20" />
          </div>
          <p class="text-secondary-foreground mt-4 text-sm font-semibold">
            No encontramos resultados
          </p>
          <p class="text-muted-foreground mt-1 text-sm">
            Intenta con otro nombre, proveedor o marca.
          </p>
        </div>
      </div>
    </template>

    <div v-else class="px-6 py-14 text-center">
      <EmptyState
        icon="lucide:package-plus"
        title="Todavía no tienes ingredientes"
        description="Agrega tu primer insumo para empezar a costear recetas y presentaciones."
        action-label="Agregar Insumo"
        @action="emit('create')"
      />
    </div>
  </Card>
</template>
