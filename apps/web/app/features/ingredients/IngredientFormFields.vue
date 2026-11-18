<script setup lang="ts">
import { computed } from 'vue';
import { UNIT_OPTIONS } from '~/features/ingredients/ingredient-units';

/**
 * Campos compartidos por los tres formularios de ingredientes (card de
 * escritorio, dialog móvil y dialog de edición). Paridad con
 * `IngredientFormFields`: el componente no incluye `<form>`, botón de
 * submit ni preview de costo; el padre decide el layout.
 *
 * Multi-root a propósito: en la variante `create` los cinco campos son nodos
 * raíz para que el padre aplique su propio grid; en `edit` el nombre pide
 * `md:col-span-2` dentro del grid de dos columnas del dialog.
 */
const props = withDefaults(defineProps<{ idPrefix: string; variant?: 'create' | 'edit' }>(), {
  variant: 'create',
});

const name = defineModel<string>('name', { required: true });
const supplier = defineModel<string>('supplier', { required: true });
const brand = defineModel<string>('brand', { required: true });
const price = defineModel<string>('price', { required: true });
const purchaseQuantity = defineModel<string>('purchaseQuantity', {
  required: true,
});
const unit = defineModel<string>('unit', { required: true });

const isCreate = computed(() => props.variant === 'create');
const nameWrapperClasses = computed(() => (props.variant === 'edit' ? 'md:col-span-2' : ''));

const LABEL_CLASSES =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground';

const PRICE_INPUT_CLASSES =
  'w-full rounded-xl border border-border bg-background py-3 pr-4 pl-8 font-mono text-sm text-foreground outline-none transition placeholder:text-subtle-foreground focus:border-accent-300 focus:bg-card focus:ring-2 focus:ring-accent-500/20';

const QUANTITY_INPUT_CLASSES =
  'text-foreground placeholder:text-subtle-foreground border-0 bg-transparent px-4 py-3 font-mono text-sm outline-none';

const QUANTITY_GROUP_CLASSES =
  'border-border bg-background focus-within:border-accent-300 focus-within:bg-card focus-within:ring-accent-500/20 grid grid-cols-[minmax(0,1fr)_5.5rem] overflow-hidden rounded-xl border transition focus-within:ring-2';
</script>

<template>
  <div :class="nameWrapperClasses">
    <Input
      :id="`${idPrefix}-name`"
      v-model="name"
      name="name"
      label="Nombre"
      required
      :placeholder="isCreate ? 'Ej. Harina de trigo extra fina' : ''"
    />
  </div>

  <div>
    <Input
      :id="`${idPrefix}-supplier`"
      v-model="supplier"
      name="supplier"
      label="Proveedor"
      :placeholder="isCreate ? 'Ej. Casa Santos Lugo' : ''"
    />
  </div>

  <div>
    <Input
      :id="`${idPrefix}-brand`"
      v-model="brand"
      name="brand"
      label="Marca"
      :placeholder="isCreate ? 'Opcional' : ''"
    />
  </div>

  <div>
    <label :class="LABEL_CLASSES" :for="`${idPrefix}-price`">
      Precio empaque <span class="text-danger">*</span>
    </label>
    <div class="relative">
      <span
        class="text-subtle-foreground pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold"
      >
        $
      </span>
      <input
        :id="`${idPrefix}-price`"
        v-model="price"
        name="price"
        type="text"
        inputmode="decimal"
        :placeholder="isCreate ? '0.00' : ''"
        :class="PRICE_INPUT_CLASSES"
        autocomplete="off"
      />
    </div>
  </div>

  <div>
    <label :class="LABEL_CLASSES" :for="`${idPrefix}-purchase-quantity`">
      Cant. empaque <span class="text-danger">*</span>
    </label>
    <div :class="QUANTITY_GROUP_CLASSES">
      <input
        :id="`${idPrefix}-purchase-quantity`"
        v-model="purchaseQuantity"
        name="purchaseQuantity"
        type="text"
        inputmode="decimal"
        :class="QUANTITY_INPUT_CLASSES"
        autocomplete="off"
      />
      <select
        v-model="unit"
        name="unit"
        aria-label="Unidad de medida"
        class="border-border bg-card text-secondary-foreground border-0 border-l px-3 py-3 text-sm font-semibold outline-none"
      >
        <option v-for="option in UNIT_OPTIONS" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
    </div>
  </div>
</template>
