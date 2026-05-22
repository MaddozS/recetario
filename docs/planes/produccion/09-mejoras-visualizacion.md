# F2: Mejoras de visualización de datos

> **Prioridad:** 🟢 Baja
> **Dependencias:** F1 (migración Basic)
> **Tier:** Basic+Pro
> **Feature gate:** `production_planner`
> **Estado:** ✅ Implementado — 2026-05-17

---

## Objetivo

Pulir la presentación de resultados sin modificar la lógica de cálculo. Mejoras de bajo esfuerzo con alto retorno en usabilidad.

---

## 1. Breakdowns colapsados por defecto

### Problema

Actualmente todos los `<details>` tienen el atributo `open`, haciendo la página interminable con varias recetas.

### Solución

```diff
// src/components/ProductionRecipeBreakdown.astro
- <details class="..." open>
+ <details class="...">
```

El usuario expande solo las recetas que le interesan.

---

## 2. Ordenamiento de tabla de ingredientes consolidados

### Problema

La tabla `ProductionIngredientsTable` muestra los ingredientes en orden de `ingredientId` (orden de inserción en el `Map`). No se puede reordenar.

### Solución

Agregar sorting client-side con click en column headers:

```astro
<!-- src/components/ProductionIngredientsTable.astro -->
<script>
  function setupSortableTable() {
    const table = document.querySelector('.ingredients-table table');
    if (!table || table.dataset.sortBound === '1') return;
    table.dataset.sortBound = '1';

    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const col = th.dataset.sort; // 'name', 'quantity', 'unitCost', 'totalCost'
        const dir = th.dataset.dir === 'asc' ? 'desc' : 'asc';
        th.dataset.dir = dir;

        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        rows.sort((a, b) => {
          const aVal = parseFloat(a.dataset[col]) || 0;
          const bVal = parseFloat(b.dataset[col]) || 0;
          return dir === 'asc' ? aVal - bVal : bVal - aVal;
        });

        rows.forEach(row => tbody.appendChild(row));
      });
    });
  }

  document.addEventListener('astro:page-load', setupSortableTable);
  document.addEventListener('astro:after-swap', setupSortableTable);
</script>
```

Agregar atributos `data-sort` en los `<th>` y `data-name`, `data-quantity`, `data-unitCost`, `data-totalCost` en los `<tr>`.

Indicador visual de orden: agregar ícono `lucide:arrow-up` / `lucide:arrow-down` junto al header activo.

---

## 3. Peso/volumen total por receta

### Problema

El breakdown muestra costos pero no el rendimiento físico total de la receta (cuánto pesa o mide el producto final).

### Solución

En cada card de receta del breakdown, agregar una línea de "Rendimiento total" que sume las cantidades de ingredientes cuya unidad sea de peso o volumen:

```ts
// Función auxiliar (puede ir en production-calculator.ts o en el componente)
function totalYield(ingredients: { quantity: number; unit: string }[]): string {
  const weightUnits = ['g', 'kg'];
  const volumeUnits = ['ml', 'lt'];
  const weightGrams: { qty: number }[] = [];
  const volumeMl: { qty: number }[] = [];

  for (const ing of ingredients) {
    const u = ing.unit.toLowerCase();
    if (u === 'kg') weightGrams.push(...);
    else if (u === 'g') weightGrams.push(...);
    else if (u === 'lt') volumeMl.push(...);
    else if (u === 'ml') volumeMl.push(...);
  }

  const totalWeight = weightGrams.reduce((sum, i) => sum + i.qty, 0);
  const totalVolume = volumeMl.reduce((sum, i) => sum + i.qty, 0);

  const parts: string[] = [];
  if (totalWeight > 0) {
    parts.push(totalWeight >= 1000
      ? `${(totalWeight / 1000).toFixed(2)} kg`
      : `${totalWeight} g`);
  }
  if (totalVolume > 0) {
    parts.push(totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(2)} lt`
      : `${totalVolume} ml`);
  }
  return parts.join(' · ') || 'N/A';
}
```

Mostrar en el summary del breakdown, debajo de la línea de batches:

```astro
<p class="text-muted-foreground mt-0.5 text-sm">
  {recipe.batches} batch{recipe.batches !== 1 ? "es" : ""}
  · Rendimiento total: {totalYieldText}
  · Costo total: {formatCurrency(recipe.totalCost)}
</p>
```

---

## 4. Badge de margen por presentación

### Problema

La tabla de presentaciones muestra ingreso pero no el margen de cada una, dificultando elegir la mejor opción.

### Solución

Agregar columna "Margen" con indicador de color:

```astro
<!-- En la tabla de presentaciones del breakdown -->
<th class="px-4 py-3">Margen</th>

<!-- En cada fila: -->
<td class="px-4 py-3 font-mono font-semibold tabular-nums">
  {p.revenue > 0 && recipe.totalCost > 0 ? (
    const margin = ((p.revenue - recipe.totalCost) / p.revenue) * 100;
    <span class:list={[
      marginColor(margin)
    ]}>
      {margin.toFixed(1)}%
    </span>
  ) : (
    <span class="text-muted-foreground">—</span>
  )}
</td>
```

Donde `marginColor` replica la lógica de `ProductionFinancialSummary`:
- Verde (`text-success`) si >20%
- Amarillo (`text-warning`) si >10%
- Rojo (`text-danger`) si ≤10%

Además, marcar la presentación más rentable con badge "Más rentable" (la de mayor margen, no mayor ingreso).

---

## 5. Formateo mejorado de cantidades en tabla consolidada

### Problema

La conversión kg→g muestra ambos valores en la misma celda (`0.5 kg (500 g)`), lo cual es redundante y ocupa espacio.

### Solución

Mostrar solo la unidad más apropiada:
- Si `totalQuantity >= 1` y unidad es `g` o `ml`, convertir a `kg` o `lt`
- Si `totalQuantity < 0.001`, mostrar en notación más legible
- Agregar tooltip con la cantidad en la unidad original

```ts
function smartQuantity(value: number, unit: string): string {
  const u = unit.toLowerCase();
  if ((u === 'g' || u === 'ml') && value >= 1000) {
    return `${(value / 1000).toFixed(2)} ${u === 'g' ? 'kg' : 'lt'}`;
  }
  if ((u === 'kg' || u === 'lt') && value < 1 && value > 0) {
    return `${(value * 1000).toFixed(0)} ${u === 'kg' ? 'g' : 'ml'}`;
  }
  return `${formatNumber(value)} ${unit}`;
}
```

---

## 6. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/components/ProductionRecipeBreakdown.astro` | Colapsar por defecto, costos en summary en lugar de peso total, badge margen por presentación, badges debajo del nombre |
| `src/components/ProductionIngredientsTable.astro` | Sorting client-side, formateo inteligente de cantidades, `table-fixed` con anchos porcentuales |
| `src/components/ProductionFinancialSummary.astro` | Rediseño completo para coincidir con `[recipe].astro`: iconos, colores, carrusel mobile |

---

## 7. Verificación

- [x] Todos los `<details>` del breakdown cargan colapsados al entrar a la página
- [x] Click en header de columna ordena la tabla (ascendente/descendente)
- [x] Indicador visual (ícono de flecha) muestra dirección de ordenamiento activo
- [x] Cada receta en el breakdown muestra costos en el summary (`Insumos · Operativo · Total`)
- [x] Recetas sin ingredientes no muestran error
- [x] Cada presentación muestra su margen (%) con color
- [x] La presentación con mayor margen muestra badge "Más rentable"
- [x] Las tags "Seleccionada" y "Más rentable" están debajo del nombre (en otro `<div>`)
- [x] Cantidades grandes en gramos se muestran en kg automáticamente
- [x] Cantidades pequeñas en kg se muestran en g automáticamente

---

## 8. Divergencias del plan original

| Planeado | Implementado |
|---|---|
| Peso/volumen total ("Rendimiento total: 2.5 kg") en el summary del breakdown | Costos desglosados: "Insumos: $X · Operativo: $Y · Total: $Z" |
| Badges inline al lado del nombre con `flex gap-1.5` | Badges en `<div>` separado debajo del nombre, con `flex flex-wrap gap-1` |
| `ProductionFinancialSummary` sin cambios | Rediseñado completamente para coincidir con los widgets de `[recipe].astro` (versión mobile con carrusel + versión desktop grid 4 columnas) |
| Columna "Margen" no planeada explícitamente | Agregada a la tabla de presentaciones con color según valor |
| Badge "Más rentable" no planeado explícitamente | Agregado como indicador de mayor margen |
| Formateo con tooltip en unidad original | `smartQuantity()` simplificado sin tooltip (convierte g→kg automáticamente) |
