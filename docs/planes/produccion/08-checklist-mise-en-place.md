# F9: Checklist de mise en place

> **Prioridad:** 🟢 Baja
> **Dependencias:** F3 (cálculo client-side para acceso a datos en cliente)
> **Tier:** Pro
> **Feature gate:** `production_advanced`

---

## Objetivo

Agregar una sección colapsable debajo de cada receta en el breakdown que lista sus ingredientes como checkboxes. El usuario marca ítems conforme los reúne, pesa y prepara. Ideal para cocineros y pasteleros que siguen un proceso de mise en place.

---

## 1. Componente: `ProductionChecklist.astro`

### 1.1 Props

```ts
interface ChecklistItem {
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
  comment?: string;
  checked: boolean;
}

interface Props {
  recipeId: number;
  recipeName: string;
  items: ChecklistItem[];
}
```

### 1.2 Template

```astro
---
import { Icon } from "astro-icon/components";
import { formatCurrency } from "@/lib/formatters";

const { recipeId, recipeName, items } = Astro.props;
const checklistId = `checklist-${recipeId}`;
---

<details class="border-border bg-card mt-4 rounded-2xl border shadow-sm">
  <summary class="hover:bg-muted flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-bold transition-colors">
    <Icon name="lucide:clipboard-check" size={16} class="text-accent-600" />
    Mise en place — {items.filter(i => i.checked).length} de {items.length} listos
  </summary>

  <div class="divide-y border-t px-2 pb-2">
    {items.map((item) => (
      <label
        class:list={[
          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors cursor-pointer",
          item.checked ? "opacity-50" : "hover:bg-muted"
        ]}
      >
        <input
          type="checkbox"
          class="checklist-checkbox h-4 w-4 rounded"
          data-recipe-id={recipeId}
          data-ingredient-id={item.ingredientId}
          checked={item.checked}
        />
        <span class:list={[
          "flex-1 text-sm",
          item.checked ? "text-muted-foreground line-through" : "text-foreground"
        ]}>
          {item.name}
          {item.comment && (
            <span class="text-muted-foreground ml-1 text-xs">
              — {item.comment}
            </span>
          )}
        </span>
        <span class="text-secondary-foreground font-mono text-sm tabular-nums">
          {formatQuantity(item.quantity)} {item.unit}
        </span>
      </label>
    ))}
  </div>

  <div class="flex justify-end gap-2 px-5 pb-3">
    <button
      class="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
      data-action="check-all"
      data-recipe-id={recipeId}
    >
      Marcar todo
    </button>
    <button
      class="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
      data-action="uncheck-all"
      data-recipe-id={recipeId}
    >
      Desmarcar todo
    </button>
  </div>
</details>
```

---

## 2. Persistencia en localStorage

```ts
// checklist.js (inline en el componente o en produccion.astro)
const CHECKLIST_KEY = 'kitchcalc_checklist';

interface ChecklistState {
  [recipeId: number]: number[]; // ingredientIds checked
}

function loadChecklistState(): ChecklistState {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
  } catch { return {}; }
}

function saveChecklistState(state: ChecklistState) {
  try {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
  } catch { /* ignorar */ }
}

function setupChecklists() {
  const state = loadChecklistState();

  // Restaurar estado
  document.querySelectorAll('.checklist-checkbox').forEach((cb) => {
    const recipeId = Number(cb.dataset.recipeId);
    const ingredientId = Number(cb.dataset.ingredientId);
    if (state[recipeId]?.includes(ingredientId)) {
      (cb as HTMLInputElement).checked = true;
      updateChecklistItem(cb);
    }

    cb.addEventListener('change', () => {
      updateChecklistItem(cb);
      // Actualizar estado
      if (!state[recipeId]) state[recipeId] = [];
      if ((cb as HTMLInputElement).checked) {
        if (!state[recipeId].includes(ingredientId)) {
          state[recipeId].push(ingredientId);
        }
      } else {
        state[recipeId] = state[recipeId].filter(id => id !== ingredientId);
      }
      saveChecklistState(state);
      updateChecklistCount(recipeId);
    });
  });

  // Actualizar contadores iniciales
  document.querySelectorAll('[id^="checklist-"]').forEach(details => {
    const recipeId = Number(details.id.replace('checklist-', ''));
    updateChecklistCount(recipeId);
  });

  // Botones marcar/desmarcar todo
  document.querySelectorAll('[data-action="check-all"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recipeId = Number(btn.dataset.recipeId);
      document.querySelectorAll(`.checklist-checkbox[data-recipe-id="${recipeId}"]`).forEach(cb => {
        (cb as HTMLInputElement).checked = true;
        updateChecklistItem(cb);
      });
      // Actualizar estado
      if (!state[recipeId]) state[recipeId] = [];
      document.querySelectorAll(`.checklist-checkbox[data-recipe-id="${recipeId}"]`).forEach(cb => {
        const ingId = Number(cb.dataset.ingredientId);
        if (!state[recipeId].includes(ingId)) state[recipeId].push(ingId);
      });
      saveChecklistState(state);
      updateChecklistCount(recipeId);
    });
  });

  // Similar para uncheck-all...
}

function updateChecklistItem(checkbox) {
  const label = checkbox.closest('label');
  const nameSpan = label.querySelector('span:first-of-type');
  if (checkbox.checked) {
    nameSpan.classList.add('line-through', 'text-muted-foreground');
    label.classList.add('opacity-50');
    label.classList.remove('hover:bg-muted');
  } else {
    nameSpan.classList.remove('line-through', 'text-muted-foreground');
    label.classList.remove('opacity-50');
    label.classList.add('hover:bg-muted');
  }
}

function updateChecklistCount(recipeId: number) {
  const details = document.getElementById(`checklist-${recipeId}`);
  if (!details) return;
  const checkboxes = details.querySelectorAll('.checklist-checkbox');
  const checked = details.querySelectorAll('.checklist-checkbox:checked').length;
  const summary = details.querySelector('summary');
  if (summary) {
    // Ya tiene el texto "Mise en place — X de Y listos"
    summary.childNodes[summary.childNodes.length - 1].textContent =
      `Mise en place — ${checked} de ${checkboxes.length} listos`;
  }
}
```

---

## 3. Integración en `ProductionRecipeBreakdown.astro`

Agregar el checklist al final del contenido de cada `<details>` (después de la tabla de presentaciones o del análisis de rentabilidad):

```astro
<ProductionChecklist
  recipeId={recipe.recipeId}
  recipeName={recipe.recipeName}
  items={getChecklistItems(recipe)}
/>
```

Donde `getChecklistItems` construye los items desde los datos de la receta (que deben estar disponibles como prop o desde la hidratación).

**Nota:** El breakdown actual recibe `ProductionRecipeResult` que no incluye los ingredientes individuales. Para el checklist, se necesita acceso a los `recipe.ingredients` de `RecipeWithIngredients`. Opciones:

1. Pasar los ingredientes como prop adicional al breakdown
2. Exponerlos vía el JSON de hidratación y construir el checklist en client-side
3. Agregar los ingredientes al tipo `ProductionRecipeResult`

**Recomendación:** Opción 1. Agregar prop `ingredients?: RecipeIngredientWithData[]` a `ProductionRecipeBreakdown` y al tipo `ProductionRecipeResult`.

---

## 4. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/components/ProductionChecklist.astro` | **Nuevo** — componente de checklist |
| `src/components/ProductionRecipeBreakdown.astro` | Integrar checklist, pasar datos de ingredientes |
| `src/lib/production-types.ts` | Agregar `ingredients?: RecipeIngredientWithData[]` a `ProductionRecipeResult` |
| `src/lib/production-calculator.ts` | Incluir ingredientes en `perRecipe` (sin costos adicionales) |
| `src/pages/produccion.astro` | Script de checklist (o inline en el componente) |

---

## 5. Verificación

- [ ] Cada receta en el breakdown tiene una sección "Mise en place" colapsable
- [ ] La sección lista todos los ingredientes con cantidades (escaladas por batch)
- [ ] Checkboxes se marcan/desmarcan y estilizan la fila (tachado, opacidad)
- [ ] Contador "X de Y listos" se actualiza en el summary del `<details>`
- [ ] Botón "Marcar todo" marca todos los checkboxes de esa receta
- [ ] Botón "Desmarcar todo" desmarca todos
- [ ] Estado de checkboxes persiste en localStorage entre recargas
- [ ] Estado de checkboxes es independiente por receta
- [ ] Comentarios de ingredientes se muestran en la lista (si existen)
- [ ] Solo Pro ve esta sección
