# F8: Comparativa de escenarios

> **Prioridad:** 🟡 Media
> **Dependencias:** F3 (cálculo client-side)
> **Tier:** Pro
> **Feature gate:** `production_advanced`

---

## Objetivo

Permitir al usuario congelar los resultados actuales como "Escenario A" y luego modificar selecciones, batches o precios para un "Escenario B", mostrando una comparativa lado a lado con diferencias en costos y ganancia.

---

## 1. Flujo de usuario

```
1. Usuario configura producción (recetas, batches, presentaciones)
2. Ve resultados en pantalla
3. Click en "Comparar escenarios"
4. Los resultados actuales se congelan como "Escenario A"
5. El selector se limpia para configurar "Escenario B"
6. Usuario configura nuevo escenario
7. Tabla comparativa muestra A vs B con diferencias
8. Puede volver a Escenario A, modificar B, o cerrar comparativa
```

---

## 2. Componente: `ProductionScenarioCompare.astro`

### 2.1 Props

```ts
interface ScenarioData {
  totalIngredientsCost: number;
  totalOperationalCost: number;
  totalProductionCost: number;
  projectedRevenue: number;
  estimatedProfit: number;
  effectiveMargin: number;
  recipeCount: number;
}

interface Props {
  scenarioA: ScenarioData | null;
  scenarioB: ScenarioData | null;
}
```

### 2.2 Template

```astro
---
import { formatCurrency } from "@/lib/formatters";
import { Icon } from "astro-icon/components";

const { scenarioA, scenarioB } = Astro.props;
const hasComparison = scenarioA && scenarioB;
---

<div class="border-border bg-card production-sheet rounded-2xl border shadow-sm">
  <div class="border-border flex items-center justify-between border-b px-6 py-4">
    <h2 class="text-foreground text-lg font-bold">Comparativa de escenarios</h2>
    <div class="flex gap-2">
      <button id="close-compare-btn" class="text-muted-foreground hover:text-foreground">
        <Icon name="lucide:x" size={18} />
      </button>
    </div>
  </div>

  {!scenarioA ? (
    <div class="p-6 text-center">
      <p class="text-muted-foreground text-sm">
        Configura tu producción actual y haz clic en "Fijar como Escenario A".
      </p>
    </div>
  ) : !scenarioB ? (
    <div class="p-6 text-center">
      <p class="text-muted-foreground text-sm">
        Escenario A fijado. Modifica las recetas o batches para definir el Escenario B.
      </p>
    </div>
  ) : (
    <div class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead>
          <tr class="text-muted-foreground border-b text-[11px] font-bold tracking-[0.16em] uppercase">
            <th class="px-6 py-3">Métrica</th>
            <th class="px-6 py-3 text-right">Escenario A</th>
            <th class="px-6 py-3 text-right">Escenario B</th>
            <th class="px-6 py-3 text-right">Diferencia</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <CompareRow
            label="Recetas"
            valueA={String(scenarioA.recipeCount)}
            valueB={String(scenarioB.recipeCount)}
            format="text"
          />
          <CompareRow
            label="Costo insumos"
            valueA={scenarioA.totalIngredientsCost}
            valueB={scenarioB.totalIngredientsCost}
            format="currency"
          />
          <CompareRow
            label="Costo operativo"
            valueA={scenarioA.totalOperationalCost}
            valueB={scenarioB.totalOperationalCost}
            format="currency"
          />
          <CompareRow
            label="Costo total"
            valueA={scenarioA.totalProductionCost}
            valueB={scenarioB.totalProductionCost}
            format="currency"
          />
          <CompareRow
            label="Ingresos proyectados"
            valueA={scenarioA.projectedRevenue}
            valueB={scenarioB.projectedRevenue}
            format="currency"
          />
          <CompareRow
            label="Ganancia est."
            valueA={scenarioA.estimatedProfit}
            valueB={scenarioB.estimatedProfit}
            format="currency"
            highlight
          />
          <CompareRow
            label="Margen efectivo"
            valueA={scenarioA.effectiveMargin}
            valueB={scenarioB.effectiveMargin}
            format="percent"
          />
        </tbody>
      </table>
    </div>
  )}
</div>
```

### 2.3 `CompareRow` fragment

```astro
---
interface CompareRowProps {
  label: string;
  valueA: string | number;
  valueB: string | number;
  format: "currency" | "percent" | "text";
  highlight?: boolean;
}

const { label, valueA, valueB, format: fmt, highlight = false } = Astro.props;

function formatValue(v: string | number): string {
  if (fmt === "currency" && typeof v === "number") return formatCurrency(v);
  if (fmt === "percent" && typeof v === "number") return `${v.toFixed(1)}%`;
  return String(v);
}

function diffColor(a: number, b: number): string {
  if (a === b) return "text-muted-foreground";
  return b > a ? "text-success" : "text-danger";
}

const numA = typeof valueA === "number" ? valueA : 0;
const numB = typeof valueB === "number" ? valueB : 0;
const delta = numB - numA;
---

<tr class:list={["hover:bg-hover-muted", highlight ? "bg-accent-50/30" : ""]}>
  <td class="px-6 py-3 font-semibold">{label}</td>
  <td class="px-6 py-3 text-right font-mono tabular-nums">{formatValue(valueA)}</td>
  <td class="px-6 py-3 text-right font-mono tabular-nums">{formatValue(valueB)}</td>
  <td class="px-6 py-3 text-right">
    {fmt !== "text" && delta !== 0 ? (
      <span class:list={["font-mono font-bold tabular-nums", diffColor(numA, numB)]}>
        {delta > 0 ? "+" : ""}{fmt === "currency" ? formatCurrency(delta) : fmt === "percent" ? `${delta.toFixed(1)}%` : delta}
      </span>
    ) : (
      <span class="text-muted-foreground">—</span>
    )}
  </td>
</tr>
```

---

## 3. Lógica client-side

### 3.1 Estado de la comparativa

```ts
type CompareState = 'idle' | 'scenario_a_set' | 'comparing';

let compareState: CompareState = 'idle';
let scenarioAData: ScenarioData | null = null;

function freezeScenarioA() {
  const summary = getCurrentSummary(); // Del cálculo actual
  scenarioAData = {
    totalIngredientsCost: summary.totalIngredientsCost,
    totalOperationalCost: summary.totalOperationalCost,
    totalProductionCost: summary.totalProductionCost,
    projectedRevenue: summary.projectedRevenue,
    estimatedProfit: summary.estimatedProfit,
    effectiveMargin: summary.effectiveMargin,
    recipeCount: summary.perRecipe.length,
  };
  compareState = 'scenario_a_set';
  updateCompareUI();
}

function compareScenarios() {
  // Calcular escenario B desde la configuración actual
  const currentSummary = getCurrentSummary();
  compareState = 'comparing';
  renderComparison(scenarioAData!, currentSummary);
}
```

### 3.2 UI de control

```html
<div id="compare-controls" class="flex justify-center gap-2">
  {compareState === 'idle' && (
    <button onclick="freezeScenarioA()">
      <Icon name="lucide:git-compare" /> Comparar escenarios
    </button>
  )}
  {compareState === 'scenario_a_set' && (
    <>
      <span class="badge">Escenario A fijado</span>
      <button onclick="compareScenarios()">
        Comparar con actual
      </button>
    </>
  )}
  {compareState === 'comparing' && (
    <>
      <button onclick="resetCompare()">
        Nueva comparativa
      </button>
      <button onclick="restoreScenarioA()">
        Volver a Escenario A
      </button>
    </>
  )}
</div>
```

---

## 4. Integración en `produccion.astro`

La comparativa se renderiza como una sección adicional entre el breakdown y los botones de impresión/CSV, controlada por el estado client-side.

El componente `ProductionScenarioCompare` puede renderizarse siempre (con `display: none` inicial) y mostrarse/ocultarse vía JS.

---

## 5. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/components/ProductionScenarioCompare.astro` | **Nuevo** — tabla comparativa A vs B |
| `src/pages/produccion.astro` | Integrar componente, lógica client-side de comparativa |
| `src/lib/production-types.ts` | Posible nuevo tipo `ScenarioData` |

---

## 6. Verificación

- [ ] Botón "Comparar escenarios" visible solo para Pro
- [ ] Click congela resultados actuales como Escenario A
- [ ] Selector se resetea para configurar Escenario B
- [ ] Tabla comparativa muestra A vs B con 7 métricas
- [ ] Columna "Diferencia" muestra delta en verde (mejora) o rojo (empeora)
- [ ] Fila de ganancia tiene highlight visual
- [ ] Se puede cerrar la comparativa y volver al estado normal
- [ ] Se puede restaurar el Escenario A (recarga la configuración original)
- [ ] La comparativa se imprime correctamente (incluida en `production-sheet`)
