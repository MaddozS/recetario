# F4: Modo "Pedido de Compras"

> **Prioridad:** 🟠 Alta
> **Dependencias:** F3 (cálculo client-side para toggle sin recarga)
> **Tier:** Pro
> **Feature gate:** `production_advanced`
> **No depende de features externas**

---

## Objetivo

Ofrecer una vista alternativa de los ingredientes consolidados que oculta costos y márgenes, enfocándose exclusivamente en la lista de compras práctica. Es el output que el usuario lleva al proveedor o supermercado.

---

## 1. Diseño de la vista

### 1.1 Toggle principal

Switch/tabs arriba de los resultados:

```
[ 📊 Vista Costos ]   [ 🛒 Lista de Compras ]
```

El estado se guarda en `localStorage` para persistir la preferencia entre sesiones.

### 1.2 Tabla de compras

Columnas:

| ✓ | Ingrediente | Cantidad | Unidad | Marca | Proveedor |
|---|---|---|---|---|---|
| ☐ | Harina 000 | 2.5 | kg | Pureza | Distribuidora Norte |

- **Sin columnas de costo** (unitario ni total)
- **Sin badges de recetas fuente** (o colapsados en tooltip opcional)
- **Checkboxes** en cada fila para marcar como comprado
- **Tachar fila** al marcar (CSS `text-decoration: line-through; opacity: 0.5`)
- **Contador**: "3 de 12 items comprados"
- **Botón "Marcar todo" / "Desmarcar todo"**
- Estado de checkboxes persistido en `localStorage` por plan (key: `shopping_${recipeIds.join(',')}`)

### 1.3 Agrupación por proveedor (opcional)

Toggle secundario: "Agrupar por proveedor"

Cuando está activo:
```
Proveedor: Distribuidora Norte
  ☐ Harina 000 — 2.5 kg — Pureza
  ☐ Azúcar — 1 kg — Ledesma

Proveedor: Sin proveedor
  ☐ Huevos — 12 unidades
  ☐ Sal — 50 g
```

---

## 2. Componente: `ProductionShoppingList.astro`

### 2.1 Props

```ts
interface Props {
  ingredients: ConsolidatedIngredient[];
  groupBySupplier: boolean; // default false
}
```

### 2.2 Template

```astro
---
import { Icon } from "astro-icon/components";
import type { ConsolidatedIngredient } from "@/lib/production-types";

const { ingredients, groupBySupplier = false } = Astro.props;

function groupBy(ingredients: ConsolidatedIngredient[]): Map<string, ConsolidatedIngredient[]> {
  const map = new Map<string, ConsolidatedIngredient[]>();
  for (const ing of ingredients) {
    const key = ing.supplier?.trim() || "Sin proveedor";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ing);
  }
  return map;
}
---

<div class="production-sheet shopping-list border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
  <div class="border-border flex items-center justify-between border-b px-6 py-4">
    <div>
      <h2 class="text-foreground text-lg font-bold">Lista de Compras</h2>
      <p class="text-muted-foreground mt-0.5 text-sm">
        <span id="shopping-checked-count">0</span> de {ingredients.length} items comprados
      </p>
    </div>
    <div class="flex items-center gap-2">
      <!-- Toggle agrupar por proveedor -->
      <button id="toggle-supplier-group" class="...">
        <Icon name="lucide:group" size={14} />
        Por proveedor
      </button>
      <!-- Marcar/desmarcar todo -->
      <button id="shopping-check-all" class="...">
        Marcar todo
      </button>
    </div>
  </div>

  <!-- Vista agrupada por proveedor -->
  <div id="shopping-by-supplier" class:list={["hidden", { hidden: !groupBySupplier }]}>
    {Array.from(groupBy(ingredients).entries()).map(([supplier, items]) => (
      <div class="border-border border-b last:border-b-0">
        <div class="bg-muted px-6 py-2 text-sm font-semibold">{supplier}</div>
        {items.map(ing => (
          <ShoppingRow ingredient={ing} />
        ))}
      </div>
    ))}
  </div>

  <!-- Vista plana (default) -->
  <div id="shopping-flat" class:list={[{ hidden: groupBySupplier }]}>
    {ingredients.map(ing => (
      <ShoppingRow ingredient={ing} />
    ))}
  </div>
</div>
```

Donde `ShoppingRow` es un fragmento reutilizable:

```astro
<div class="shopping-row hover:bg-hover-muted flex items-center gap-4 border-b px-6 py-3 transition-colors">
  <input type="checkbox" class="shopping-checkbox ..." data-ingredient-id={ing.ingredientId} />
  <span class="flex-1 font-medium shopping-label">{ing.name}</span>
  <span class="text-muted-foreground">{ing.brand || ''}</span>
  <span class="text-secondary-foreground font-mono tabular-nums">{smartQuantity(ing.totalQuantity, ing.unit)}</span>
</div>
```

---

## 3. Lógica client-side

```ts
// shopping-list.js (inline en el componente)
const STORAGE_KEY_PREFIX = 'kitchcalc_shopping_';

function getStorageKey(): string {
  const params = new URLSearchParams(location.search);
  const recipeIds = params.get('recipes') || '';
  return `${STORAGE_KEY_PREFIX}${recipeIds}`;
}

function loadCheckState(): Set<number> {
  try {
    const data = localStorage.getItem(getStorageKey());
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch { return new Set(); }
}

function saveCheckState(checked: Set<number>) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify([...checked]));
  } catch { /* ignorar */ }
}

function setupShoppingList() {
  const checkboxes = document.querySelectorAll('.shopping-checkbox');
  const checked = loadCheckState();

  // Restaurar estado
  checkboxes.forEach(cb => {
    const id = Number(cb.dataset.ingredientId);
    if (checked.has(id)) cb.checked = true;
    updateRowStyle(cb);
  });

  updateCount();

  // Bindear cambios
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      updateRowStyle(cb);
      updateCount();
      const id = Number(cb.dataset.ingredientId);
      if (cb.checked) checked.add(id);
      else checked.delete(id);
      saveCheckState(checked);
    });
  });
}

function updateRowStyle(checkbox) {
  const row = checkbox.closest('.shopping-row');
  const label = row.querySelector('.shopping-label');
  if (checkbox.checked) {
    label.classList.add('line-through', 'opacity-50');
  } else {
    label.classList.remove('line-through', 'opacity-50');
  }
}

function updateCount() {
  const total = document.querySelectorAll('.shopping-checkbox').length;
  const checked = document.querySelectorAll('.shopping-checkbox:checked').length;
  const el = document.getElementById('shopping-checked-count');
  if (el) el.textContent = String(checked);
}

// Setup + eventos astro
document.addEventListener('astro:page-load', setupShoppingList);
document.addEventListener('astro:after-swap', setupShoppingList);
```

---

## 4. Integración en `produccion.astro`

### 4.1 Toggle entre vistas

```astro
---
import ProductionShoppingList from "../components/ProductionShoppingList.astro";
---

<!-- Después de los resultados, reemplazar la tabla de ingredientes por toggle: -->
{results && (
  <div class="space-y-6">
    <!-- Toggle de vista -->
    <div class="flex justify-center">
      <div class="border-border bg-muted inline-flex rounded-xl border p-1">
        <button id="view-costs-btn" class="...active...">
          <Icon name="lucide:dollar-sign" size={14} />
          Costos
        </button>
        <button id="view-shopping-btn" class="...">
          <Icon name="lucide:shopping-cart" size={14} />
          Compras
        </button>
      </div>
    </div>

    <!-- Vista activa -->
    <div id="view-costs">
      <ProductionIngredientsTable ingredients={results.consolidatedIngredients} />
      <ProductionFinancialSummary summary={results.summary} />
      <ProductionRecipeBreakdown recipes={results.summary.perRecipe} />
    </div>

    <div id="view-shopping" class="hidden">
      <ProductionShoppingList ingredients={results.consolidatedIngredients} />
    </div>
  </div>
)}
```

### 4.2 Persistencia de vista activa

```ts
const VIEW_STORAGE_KEY = 'kitchcalc_production_view';

function getInitialView(): 'costs' | 'shopping' {
  return localStorage.getItem(VIEW_STORAGE_KEY) === 'shopping' ? 'shopping' : 'costs';
}

function setView(view: 'costs' | 'shopping') {
  localStorage.setItem(VIEW_STORAGE_KEY, view);
  document.getElementById('view-costs').classList.toggle('hidden', view !== 'costs');
  document.getElementById('view-shopping').classList.toggle('hidden', view !== 'shopping');
  // Actualizar estilos de botones toggle
}
```

---

## 5. Consideraciones

- El toggle **reemplaza** el `ProductionIngredientsTable` en la vista de compras, pero **no elimina** el `ProductionFinancialSummary` ni el `ProductionRecipeBreakdown` — se muestran/ocultan juntos con la vista de costos.
- Los checkboxes son efímeros y ligados a la combinación de recetas (key en localStorage). No se persisten en base de datos.
- Si el usuario cambia las recetas seleccionadas (y por tanto los query params), los checkboxes se resetean (nueva key).
- El botón de impresión (`window.print()`) debe ocultar los checkboxes en `@media print` y mostrar solo el texto tachado.

---

## 6. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/components/ProductionShoppingList.astro` | **Nuevo** — componente de lista de compras |
| `src/pages/produccion.astro` | Toggle de vista (costos/compras), integración del componente |
| `src/styles/global.css` | Estilos para `.shopping-row`, `.shopping-checkbox`, toggle buttons |

---

## 7. Verificación

- [ ] Toggle "Compras" muestra la lista de ingredientes sin costos
- [ ] Toggle "Costos" vuelve a la vista original con tabla financiera
- [ ] Checkboxes se marcan/desmarcan y el texto se tacha
- [ ] Contador "X de Y items comprados" se actualiza
- [ ] Botón "Marcar todo" marca todos los checkboxes
- [ ] Estado de checkboxes persiste al recargar la página (mismos query params)
- [ ] Estado de checkboxes se resetea al cambiar recetas seleccionadas
- [ ] Vista activa (costos/compras) persiste en localStorage
- [ ] Agrupar por proveedor muestra los ingredientes bajo el nombre del proveedor
- [ ] Ingredientes sin proveedor aparecen bajo "Sin proveedor"
- [ ] Impresión: checkboxes se ocultan, items comprados aparecen tachados
- [ ] Solo Pro tiene acceso a esta vista (Basic ve el toggle deshabilitado con tooltip "Pro")
