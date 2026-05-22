# F7: Exportación CSV de ingredientes consolidados

> **Prioridad:** 🟡 Media
> **Dependencias:** Ninguna (puede implementarse en cualquier momento, no requiere F3)
> **Tier:** Pro
> **Feature gate:** `production_advanced` + `data_import_export`

---

## Objetivo

Permitir al usuario descargar la lista de ingredientes consolidados como archivo CSV para usar en herramientas externas, compartir con proveedores o importar en sistemas de compras.

---

## 1. Generación del CSV

### 1.1 `src/lib/export-csv.ts`

```ts
import type { ConsolidatedIngredient } from "@/lib/production-types";

export function generateProductionCsv(ingredients: ConsolidatedIngredient[]): string {
  const headers = [
    "Ingrediente",
    "Cantidad",
    "Unidad",
    "Marca",
    "Proveedor",
    "Costo Unitario",
    "Costo Total",
    "Recetas",
  ];

  const rows = ingredients.map((ing) => {
    const recipeNames = ing.sourceRecipes
      .map((src) => src.recipeName)
      .join("; ");

    return [
      escapeCsvField(ing.name),
      ing.totalQuantity.toString(),
      ing.unit,
      escapeCsvField(ing.brand ?? ""),
      escapeCsvField(ing.supplier ?? ""),
      ing.unitCost.toFixed(4),
      ing.totalCost.toFixed(2),
      escapeCsvField(recipeNames),
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Escapa campos CSV: envuelve en comillas si contiene coma, comillas o salto de línea.
 */
function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Descarga un string como archivo en el navegador.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### 1.2 CSV de compras (sin costos)

Variante simplificada para el modo "Pedido de Compras":

```ts
export function generateShoppingCsv(ingredients: ConsolidatedIngredient[]): string {
  const headers = ["Ingrediente", "Cantidad", "Unidad", "Marca", "Proveedor"];

  const rows = ingredients.map((ing) => [
    escapeCsvField(ing.name),
    ing.totalQuantity.toString(),
    ing.unit,
    escapeCsvField(ing.brand ?? ""),
    escapeCsvField(ing.supplier ?? ""),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
```

---

## 2. Integración en `produccion.astro`

### 2.1 Botón de descarga

Junto al botón de impresión, agregar:

```astro
---
import { hasFeature } from "../lib/subscription";

const canExport = hasFeature(subscription, "data_import_export") &&
                 hasFeature(subscription, "production_advanced");
---

{canExport && results && (
  <div class="no-print flex justify-center gap-3">
    <button
      onclick="window.print()"
      class="border-border bg-card text-muted-foreground hover:bg-background inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-bold transition-colors"
    >
      <Icon name="lucide:printer" size={16} />
      Imprimir
    </button>
    <button
      id="download-csv-btn"
      class="border-border bg-card text-muted-foreground hover:bg-background inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-bold transition-colors"
    >
      <Icon name="lucide:download" size={16} />
      Descargar CSV
    </button>
  </div>
)}
```

### 2.2 Script client-side

```html
<script>
  import { generateProductionCsv, downloadCsv } from "../lib/export-csv";

  function setupCsvDownload() {
    const btn = document.getElementById('download-csv-btn');
    if (!btn || btn.dataset.csvBound === '1') return;
    btn.dataset.csvBound = '1';

    btn.addEventListener('click', () => {
      // Obtener datos de los ingredientes consolidados desde el DOM o desde la variable global
      const ingredientsData = window.__productionIngredients;
      if (!ingredientsData) return;

      const csv = generateProductionCsv(ingredientsData);
      const date = new Date().toISOString().split('T')[0];
      downloadCsv(csv, `produccion-ingredientes-${date}.csv`);
    });
  }

  document.addEventListener('astro:page-load', setupCsvDownload);
  document.addEventListener('astro:after-swap', setupCsvDownload);
</script>
```

### 2.3 Exponer datos al cliente

En el script de hidratación de F3, exponer también los ingredientes:

```html
<script>
  window.__productionIngredients = JSON.parse(
    document.getElementById('production-ingredients-data')?.textContent || '[]'
  );
</script>
```

```astro
<script type="application/json" id="production-ingredients-data">
  {JSON.stringify(results?.consolidatedIngredients ?? [])}
</script>
```

---

## 3. Opción: CSV desde el modo compras

Cuando está activa la vista de compras (F4), el botón CSV debe descargar la versión sin costos:

```ts
// Detectar vista activa
const isShoppingView = document.getElementById('view-shopping')?.classList.contains('hidden') === false;

if (isShoppingView) {
  csv = generateShoppingCsv(ingredientsData);
  filename = `lista-compras-${date}.csv`;
} else {
  csv = generateProductionCsv(ingredientsData);
  filename = `produccion-ingredientes-${date}.csv`;
}
```

---

## 4. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/lib/export-csv.ts` | **Nuevo** — funciones de generación y descarga CSV |
| `src/pages/produccion.astro` | Botón de descarga, script de exportación, hidratación de datos |

---

## 5. Verificación

- [ ] Botón "Descargar CSV" visible solo para Pro (con `data_import_export` y `production_advanced`)
- [ ] Click descarga archivo `.csv` con nombre `produccion-ingredientes-YYYY-MM-DD.csv`
- [ ] CSV contiene columnas: Ingrediente, Cantidad, Unidad, Marca, Proveedor, Costo Unitario, Costo Total, Recetas
- [ ] Campos con comas o comillas están correctamente escapados
- [ ] Nombres de recetas fuente aparecen separados por `;`
- [ ] En modo compras, CSV excluye columnas de costo
- [ ] El archivo se abre correctamente en Excel / Google Sheets
- [ ] CSV usa UTF-8 con BOM para compatibilidad con Excel en Windows (opcional pero recomendado)
