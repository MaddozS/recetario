# F6: Precios interactivos y rentabilidad por presentación

> **Prioridad:** 🟡 Media
> **Dependencias:** F3 (cálculo client-side necesario para actualización instantánea)
> **Tier:** Pro
> **Feature gate:** `production_advanced`

---

## Objetivo

Permitir al usuario ajustar precios de venta directamente en la tabla de presentaciones del breakdown y ver el margen recalcularse al instante. Agregar análisis de rentabilidad por presentación para facilitar decisiones de pricing.

---

## 1. Inputs editables de precio de venta

### 1.1 Cambio en `ProductionRecipeBreakdown.astro`

Reemplazar las celdas de "Precio venta" por inputs editables:

```astro
<!-- Antes (solo lectura): -->
<td class="px-4 py-3 font-mono tabular-nums">
  {p.salePrice ? formatCurrency(p.salePrice) : "Sin precio"}
</td>

<!-- Después (editable): -->
<td class="px-4 py-3">
  <input
    type="number"
    name="sale_price"
    value={p.salePrice ?? ''}
    step="0.01"
    min="0"
    placeholder="Sin precio"
    data-recipe-id={recipe.recipeId}
    data-presentation-name={p.name}
    class:list={[
      "border bg-transparent rounded-lg px-2 py-1.5 text-sm font-mono tabular-nums w-24",
      p.salePrice
        ? "border-border text-foreground"
        : "border-warning-border text-warning"
    ]}
  />
</td>
```

### 1.2 Recalcular al editar

El script client-side de F3 debe escuchar cambios en estos inputs:

```ts
document.querySelectorAll('input[name="sale_price"]').forEach(input => {
  input.addEventListener('input', () => {
    const recipeId = Number(input.dataset.recipeId);
    const presName = input.dataset.presentationName;
    const newPrice = parseFloat(input.value) || undefined;

    // Actualizar el modelo de datos en memoria
    updatePresentationPrice(recipeId, presName, newPrice);

    // Recalcular toda la producción
    recalculate();
  });
});
```

---

## 2. Columna de margen por presentación

Agregar columna en la tabla de presentaciones:

```astro
<th class="px-4 py-3">Margen</th>

<!-- En cada fila: -->
<td class="px-4 py-3">
  {recipe.totalCost > 0 && p.revenue > 0 ? (
    const margin = ((p.revenue - recipe.totalCost) / p.revenue) * 100;
    <span class:list={[
      "text-sm font-bold tabular-nums",
      margin > 30 ? "text-success" :
      margin > 15 ? "text-warning" :
      "text-danger"
    ]}>
      {margin.toFixed(1)}%
    </span>
  ) : (
    <span class="text-muted-foreground text-sm">—</span>
  )}
</td>
```

---

## 3. Análisis de rentabilidad

### 3.1 Nueva sección en el breakdown

Debajo de la tabla de presentaciones, agregar un mini-análisis:

```astro
<div class="bg-muted mt-4 rounded-xl p-4">
  <h5 class="text-foreground mb-2 text-sm font-bold">Análisis de rentabilidad</h5>
  <div class="space-y-2">
    {(() => {
      const profitable = recipe.presentations
        .filter(p => p.revenue > 0 && recipe.totalCost > 0)
        .map(p => ({
          name: p.name,
          margin: ((p.revenue - recipe.totalCost) / p.revenue) * 100,
          revenue: p.revenue,
          isSelected: p.id === recipe.selectedPresentationId,
        }))
        .sort((a, b) => b.margin - a.margin);

      if (profitable.length === 0) {
        return <p class="text-muted-foreground text-sm">Sin datos de rentabilidad</p>;
      }

      return profitable.map((p, i) => (
        <div class="flex items-center gap-2 text-sm">
          {p.isSelected && (
            <span class="bg-accent-100 text-accent-700 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold">
              Actual
            </span>
          )}
          {i === 0 && !p.isSelected && (
            <span class="bg-success-bg text-success shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold">
              Mejor
            </span>
          )}
          <span class="text-foreground flex-1">{p.name}</span>
          <span class="text-muted-foreground">{formatCurrency(p.revenue)}</span>
          <span class:list={[
            "font-mono font-bold tabular-nums",
            p.margin > 30 ? "text-success" :
            p.margin > 15 ? "text-warning" :
            "text-danger"
          ]}>
            {p.margin.toFixed(1)}%
          </span>
        </div>
      ));
    })()}
  </div>
</div>
```

---

## 4. Badge "Más rentable" en tabla de presentaciones

En la tabla de presentaciones, marcar la fila con mayor margen:

```astro
{(() => {
  const bestMargin = recipe.presentations
    .filter(p => p.revenue > 0 && recipe.totalCost > 0)
    .reduce((best, p) => {
      const m = ((p.revenue - recipe.totalCost) / p.revenue) * 100;
      return m > best.margin ? { id: p.id, margin: m } : best;
    }, { id: -1, margin: -Infinity });

  return (
    <tr ...>
      <td>
        {p.name}
        {p.id === bestMargin.id && (
          <span class="bg-success-bg text-success ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold">
            Más rentable
          </span>
        )}
        {p.id === recipe.selectedPresentationId && (
          <span class="bg-accent-100 text-accent-700 ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold">
            Seleccionada
          </span>
        )}
      </td>
      ...
    </tr>
  );
})()}
```

---

## 5. Sincronización con el cálculo global

Cuando el usuario cambia un precio de venta, el nuevo valor debe:
1. Actualizar el modelo de datos en memoria del cliente
2. Recalcular `calculateProduction()` con el nuevo precio
3. Actualizar la tabla de ingredientes consolidados (no cambia)
4. Actualizar el resumen financiero (ingresos, ganancia, margen)
5. Actualizar el breakdown de la receta afectada (margen, revenue)
6. Actualizar el análisis de rentabilidad
7. NO actualizar la URL (el precio editado es efímero, no se persiste en query params)

```ts
function updatePresentationPrice(recipeId: number, presName: string, newPrice?: number) {
  const recipe = recipeData.find(r => r.id === recipeId);
  if (!recipe) return;

  const pres = recipe.presentations.find(p => p.name === presName);
  if (pres) {
    pres.salePrice = newPrice;
  }
}
```

---

## 6. Opcional: Sugerencia de precio para margen objetivo

Input adicional debajo de la tabla que permite al usuario definir un margen deseado y ver el precio sugerido:

```astro
<div class="bg-accent-50 border-accent-200 mt-4 rounded-xl border p-4">
  <label class="text-foreground flex items-center gap-3 text-sm">
    <span>Margen deseado:</span>
    <input
      type="number"
      id={`target-margin-${recipe.recipeId}`}
      value={recipe.desiredMargin}
      min="0"
      max="99"
      class="border-border bg-background w-16 rounded-lg border px-2 py-1 text-center text-sm"
    />%
  </label>
  <p class="text-muted-foreground mt-2 text-sm">
    Precio sugerido: <span id={`suggested-price-${recipe.recipeId}`} class="text-foreground font-bold">
      {recipe.totalCost > 0
        ? formatCurrency(recipe.totalCost / (1 - targetMargin / 100))
        : '—'}
    </span>
  </p>
</div>
```

---

## 7. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/components/ProductionRecipeBreakdown.astro` | Inputs editables de precio, columna margen, badge "Más rentable", análisis rentabilidad |
| `src/pages/produccion.astro` | Script client-side: listeners de inputs, recálculo con precios editados |
| `src/lib/production-calculator.ts` | Posible nueva función helper `recalculateWithPrice()` |
| `src/lib/production-types.ts` | Sin cambios (los tipos ya soportan `salePrice?: number`) |

---

## 8. Verificación

- [ ] Inputs de precio de venta son editables en la tabla de presentaciones
- [ ] Cambiar un precio → margen y revenue se actualizan instantáneamente
- [ ] Cambiar un precio → resumen financiero global se actualiza
- [ ] Columna "Margen" muestra porcentaje con color (verde/amarillo/rojo)
- [ ] Presentación sin precio muestra "—" en margen y revenue
- [ ] Presentación con mayor margen muestra badge "Más rentable"
- [ ] Presentación seleccionada muestra badge "Seleccionada"
- [ ] Ambas badges pueden coexistir en la misma fila (si la seleccionada es la más rentable)
- [ ] Análisis de rentabilidad ordena presentaciones por margen descendente
- [ ] Precios editados NO persisten en query params (son efímeros)
- [ ] Recargar la página restaura los precios originales desde la DB
- [ ] (Opcional) Input de margen deseado calcula precio sugerido
