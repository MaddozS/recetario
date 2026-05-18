# F3: Cálculo client-side instantáneo

> **Prioridad:** 🔴 Crítica
> **Dependencias:** F1 (migración Basic)
> **Tier:** Pro
> **Feature gate:** `production_advanced`
> **Habilita:** F4, F6, F8, F9

---

## Objetivo

Eliminar el ciclo POST-redirect-GET reemplazándolo por cálculo en el navegador. El usuario modifica selecciones, batches o presentaciones y ve resultados actualizados al instante sin recarga de página.

---

## 1. Arquitectura

### Flujo actual (a eliminar progresivamente)

```
Usuario cambia inputs → Submit form → POST → redirect → GET con query params → render server-side
```

### Flujo nuevo

```
Usuario cambia inputs → JS recalcula → actualiza DOM (tablas, summary, breakdown)
                         │
                         └→ Actualiza URL (history.replaceState) para bookmarking
Primer render: GET con query params → server-side render (hidratación inicial)
```

**Estrategia híbrida:**
- El servidor sigue renderizando el estado inicial desde query params (SEO, compartir links, carga inicial)
- El cliente recalcula instantáneamente al cambiar cualquier input
- El servidor no desaparece — se usa como fallback y para el primer render

---

## 2. Hacer `production-calculator.ts` ejecutable en cliente

### Problema

Actualmente el módulo importa tipos de `@/lib/production-types` que podrían no ser tree-shakeables. Debe ser un módulo puro sin dependencias de servidor.

### Verificación

El archivo actual (`src/lib/production-calculator.ts`) solo importa tipos y usa funciones puras. No tiene dependencias de `prisma`, `auth`, ni Node.js. Es seguro importarlo en el cliente.

**Acción:** Verificar que `astro.config.mjs` o `vite` no excluyan este archivo del bundle del cliente. Si es necesario, agregar a `vite.optimizeDeps.include`.

---

## 3. Script client-side en `produccion.astro`

### 3.1 Estructura del script

```astro
<script>
  import { calculateProduction } from "../lib/production-calculator";
  import type { ProductionRecipeSelection, ConsolidatedIngredient, ProductionSummary } from "../lib/production-types";

  // Datos iniciales hidratados desde el servidor
  const recipeData = JSON.parse(document.getElementById('production-data')?.textContent || '{}');

  function recalculate() {
    // 1. Leer selecciones del DOM (checkboxes, batches, presentaciones)
    // 2. Construir ProductionRecipeSelection[]
    // 3. Construir RecipeWithIngredients[] desde recipeData
    // 4. Llamar calculateProduction()
    // 5. Actualizar DOM: ingredientes, summary, breakdown
    // 6. Actualizar URL con history.replaceState
  }

  // Debounce para inputs numéricos
  let debounceTimer: number;
  function onInputChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(recalculate, 150);
  }

  // Bindear eventos a checkboxes, inputs de batches, selects de presentación
  function bindEvents() {
    // Usar data-calc-bound="1" para evitar double-binding
  }

  document.addEventListener('astro:page-load', bindEvents);
  document.addEventListener('astro:after-swap', bindEvents);
</script>
```

### 3.2 Hidratación de datos

El servidor expone los datos completos de las recetas en un `<script type="application/json">` para que el cliente los use sin necesidad de fetch adicional:

```astro
---
// En el frontmatter del server:
const allRecipeData = canAccess
  ? await Promise.all(allRecipes.map(r => getRecipeById(r.id, ownerId)))
  : [];
---

<script type="application/json" id="production-data">
  {JSON.stringify(allRecipeData.filter(Boolean))}
</script>
```

### 3.3 Re-renderizado del DOM

En lugar de manipular el DOM manualmente (frágil), usar un enfoque de templates:

**Opción A — Simple (recomendado para MVP):**
Manipular DOM directamente: actualizar `textContent` de celdas, mostrar/ocultar filas.

**Opción B — Robusta (escalable):**
Usar una función `renderResults(container, data)` que reconstruye el HTML de resultados desde los datos calculados, usando `innerHTML` con templates.

Se recomienda **Opción A** para la Fase 2, migrando a B si la complejidad crece.

---

## 4. Funciones del DOM a actualizar

| Sección | Elementos a actualizar |
|---|---|
| Ingredientes consolidados | `tbody` de la tabla: filas, cantidades, costos |
| Resumen financiero | 4 cards: costo insumos, costo operativo, ingresos, ganancia + margen |
| Desglose por receta | Cada `<details>`: costos, tabla de presentaciones, badges |
| Badge de seleccionadas | Contador "X recetas seleccionadas" (nuevo, ver abajo) |

---

## 5. Nuevo indicador: contador de recetas seleccionadas

Agregar en el selector, arriba del botón "Calcular producción" (que ahora podría llamarse "Refrescar" o simplemente desaparecer):

```astro
<div class="flex items-center justify-between">
  <span class="text-muted-foreground text-sm">
    <span id="selected-count">{selections.length}</span> de {allRecipes.length} recetas seleccionadas
  </span>
  <!-- El botón de submit solo aparece si JS está deshabilitado (noscript) -->
  <noscript>
    <button type="submit">Calcular producción</button>
  </noscript>
</div>
```

---

## 6. Manejo de URL y estado

```ts
function updateURL(selections: ProductionRecipeSelection[]) {
  const params = new URLSearchParams();
  params.set('recipes', selections.map(s => s.recipeId).join(','));
  params.set('batches', selections.map(s => s.batches).join(','));
  const presIds = selections
    .map(s => s.presentationId)
    .filter((id): id is number => id !== undefined);
  if (presIds.length > 0) {
    params.set('presentations', presIds.join(','));
  }
  history.replaceState(null, '', `/produccion?${params.toString()}`);
}
```

---

## 7. El botón "Calcular producción"

Con el cálculo client-side, el botón pierde su función principal. Dos opciones:

**Opción A (recomendada):** Eliminar el `<button type="submit">`. El cálculo es automático al cambiar inputs. El botón sobra.

**Opción B:** Mantenerlo como "Refrescar" que simplemente llama `recalculate()`. Redundante pero familiar.

Se elige **Opción A** con un `<noscript>` fallback que muestra el botón de submit tradicional para usuarios sin JS.

---

## 8. Eliminación del POST handler

Una vez que el cálculo client-side funciona:

1. **Conservar** el render server-side desde GET (query params) — necesario para carga inicial, SEO, compartir links
2. **Eliminar** el bloque `if (Astro.request.method === "POST")` — ya no es necesario
3. El GET handler existente se mantiene intacto

---

## 9. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/pages/produccion.astro` | Agregar `<script>` client-side, hidratación JSON, eliminar POST handler, noscript fallback |
| `src/lib/production-calculator.ts` | Verificar tree-shakeability, posible export de helpers adicionales |
| `src/components/ProductionRecipeSelector.astro` | Quitar `<form method="post">`, cambiar a `<div>` con eventos JS, contador de seleccionadas |
| `src/components/ProductionIngredientsTable.astro` | Agregar IDs/selectores para actualización DOM |
| `src/components/ProductionFinancialSummary.astro` | Agregar IDs/selectores para actualización DOM |
| `src/components/ProductionRecipeBreakdown.astro` | Agregar IDs/selectores para actualización DOM |

---

## 10. Verificación

- [ ] Cambiar un checkbox de receta → resultados se actualizan en <200ms sin recarga
- [ ] Cambiar número de batches → resultados se actualizan tras debounce de 150ms
- [ ] Cambiar presentación seleccionada → revenue y profit se recalculan
- [ ] URL se actualiza con `history.replaceState` al cambiar selecciones
- [ ] Refrescar la página con query params → render server-side muestra el mismo estado
- [ ] Sin JavaScript (noscript) → el formulario hace POST y redirect como antes
- [ ] `calculateProduction` se ejecuta correctamente en el bundle del cliente
- [ ] Sin errores de dependencias server-side en el bundle del cliente
- [ ] Contador "X de Y recetas seleccionadas" se actualiza en tiempo real
- [ ] Usuario Basic: el límite de 3 recetas se aplica también en client-side
