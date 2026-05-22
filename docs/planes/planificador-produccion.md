# Plan: Planificador de Producción

> **Prioridad:** 🟠 Alta  
> **Fecha del plan:** 2026-05-09  
> **Estado actual:** No implementado. El multiplicador de batch en recetas individuales existe pero no hay planificación multi-receta consolidada.  
> **Feature gate:** `production_planner` (Pro tier exclusivo — ya configurado en `billing.ts` y `subscription.ts`)  
> **Decisión de diseño:** Cálculo server-side efímero (sin persistencia en MVP). Página dedicada `/produccion`. Todas las queries usan las funciones existentes de `recipe-data`. Sin nuevas tablas DB.

---

## Objetivo

Permitir al usuario seleccionar múltiples recetas, definir cuántas mezclas/batches producir de cada una, y obtener:

1. **Lista de ingredientes consolidada** — cantidades totales agrupadas por ingrediente (sumando repeticiones entre recetas)
2. **Costo total desglosado** — insumos + costos operativos + margen
3. **Ganancia proyectada** — ingresos por ventas − costo total
4. **Hoja de producción print-friendly** — layout optimizado para impresión

---

## 1. Arquitectura (sin nuevas tablas)

El planificador es puramente computacional. Usa las funciones existentes de `src/lib/recipe-data`:

| Función                                 | Uso                                              |
| --------------------------------------- | ------------------------------------------------ |
| `listRecipeSummaries(ownerId)`          | Selector de recetas (nombre, id, categoría)      |
| `getRecipeById(id, ownerId)`            | Obtener ingredientes + presentaciones + márgenes |
| `hasFeature(sub, 'production_planner')` | Gate de acceso (Pro)                             |

No se crean tablas nuevas. Si en el futuro se agrega persistencia de "planes de producción guardados", se agregará una tabla `production_plans`.

---

## 2. Ruta y protección

### 2.1 Nueva página: `src/pages/produccion.astro`

- **Ruta:** `/produccion`
- **Protección auth:** `Astro.locals.session` + `Astro.locals.user` (redirige a `/sign-in`)
- **Feature gate:** `hasFeature(subscription, 'production_planner')` — si es false, renderiza `<UpgradePrompt tier="pro" feature="Planificador de producción" description="El Planificador de producción te permite consolidar ingredientes y costos de múltiples recetas en una sola vista." />`

### 2.2 Navegación

Agregar enlace en `Layout.astro`:

**Desktop sidebar** — entre las secciones de Recetas/Ingredientes y Ajustes:

```astro
{
  currentPage === "production"
    ? "bg-accent-600 text-white"
    : "text-muted-foreground hover:bg-muted"
}
```

Solo renderizar cuando `hasFeature(subscription, 'production_planner')` es true.

**Mobile nav** — cambiar `grid-cols-3` a `grid-cols-4` y agregar el 4° botón con el mismo condicional:

```astro
<a
  href="/produccion"
  class:list={[
    "flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors",
    currentPage === "production"
      ? "bg-accent-600 text-white"
      : "text-muted-foreground hover:bg-muted",
  ]}
>
  <Icon name="lucide:factory" size={16} />
  Producción
</a>
```

---

## 3. Tipos (`src/lib/production-types.ts`)

```ts
export type ProductionRecipeSelection = {
  recipeId: number;
  batches: number;
};

export type ConsolidatedIngredient = {
  ingredientId: number;
  name: string;
  brand?: string;
  supplier?: string;
  totalQuantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  sourceRecipes: { recipeId: number; recipeName: string; quantity: number }[];
};

export type ProductionSummary = {
  totalIngredientsCost: number;
  totalOperationalCost: number;
  totalProductionCost: number;
  projectedRevenue: number;
  estimatedProfit: number;
  effectiveMargin: number;
  perRecipe: ProductionRecipeResult[];
};

export type ProductionRecipeResult = {
  recipeId: number;
  recipeName: string;
  category?: string;
  batches: number;
  ingredientsCost: number;
  operationalCost: number;
  totalCost: number;
  presentations: {
    name: string;
    totalUnits: number;
    unitCost: number;
    salePrice?: number;
    revenue: number;
  }[];
};
```

---

## 4. Lógica de cálculo (`src/lib/production-calculator.ts`)

Función principal:

```ts
export function calculateProduction(
  selections: ProductionRecipeSelection[],
  recipes: RecipeWithIngredients[],
): {
  consolidatedIngredients: ConsolidatedIngredient[];
  summary: ProductionSummary;
};
```

### 4.1 Algoritmo

1. Itera sobre cada receta seleccionada
2. Para cada ingrediente de la receta, multiplica `quantity` por `batches`
3. Acumula en un mapa `Map<ingredientId, ConsolidatedIngredient>`:
   - Suma `totalQuantity`
   - Suma `totalCost` (unitCost × quantity × batches)
   - Agrega entrada a `sourceRecipes`
4. Calcula costo operativo por receta: `ingredientsCost × (fixedCostsPercentage / 100)`
5. Suma todos los costos para obtener totales
6. Calcula ingresos proyectados sumando `salePrice × totalUnits` por presentación (usa la presentación de mayor ingreso o permite seleccionar cuál)

### 4.2 Cálculo de unitCost por ingrediente

```ts
function unitCost(ingredient: Ingredient): number {
  return ingredient.price / ingredient.purchaseQuantity;
}
```

### 4.3 Formateo de cantidades

Usar `aplicarRedondeoUnidadPequena()` (del recipe page) para cantidades en g/ml, y redondeo estándar para unidades mayores.

---

## 5. Página `/produccion` (SRP — Server Render Pattern)

### 5.1 Frontmatter

```astro
---
import Layout from "../layouts/Layout.astro";
import {
  getRecipeDataOwner,
  getRecipeById,
  listRecipeSummaries,
} from "../lib/recipe-data";
import { hasFeature } from "../lib/subscription";
import { calculateProduction } from "../lib/production-calculator";
import type { ProductionRecipeSelection } from "../lib/production-types";
import UpgradePrompt from "../components/UpgradePrompt.astro";
import ProductionRecipeSelector from "../components/ProductionRecipeSelector.astro";
import ProductionIngredientsTable from "../components/ProductionIngredientsTable.astro";
import ProductionFinancialSummary from "../components/ProductionFinancialSummary.astro";
import ProductionRecipeBreakdown from "../components/ProductionRecipeBreakdown.astro";

if (!Astro.locals.session || !Astro.locals.user) {
  return Astro.redirect("/sign-in");
}

const recipeDataOwner = getRecipeDataOwner(Astro.locals.user);
const subscription = Astro.locals.subscription;
const canAccess = hasFeature(subscription, "production_planner");

// Leer selección del form (POST) o query params (GET)
let selections: ProductionRecipeSelection[] = [];
let results: {
  consolidatedIngredients: ConsolidatedIngredient[];
  summary: ProductionSummary;
} | null = null;

if (canAccess && Astro.request.method === "POST") {
  const formData = await Astro.request.formData();
  const recipeIds = formData.getAll("recipe_id").map(Number);
  const batches = formData.getAll("batches").map(Number);

  selections = recipeIds.map((id, i) => ({
    recipeId: id,
    batches: batches[i] || 1,
  }));

  const recipes = await Promise.all(
    selections.map((s) => getRecipeById(s.recipeId, recipeDataOwner)),
  );

  const validRecipes = recipes.filter(Boolean);
  results = calculateProduction(
    selections.filter((_, i) => validRecipes[i]),
    validRecipes,
  );
}

const allRecipes = canAccess ? await listRecipeSummaries(recipeDataOwner) : [];
const currentPage = "production";
---
```

### 5.2 Template

```astro
<Layout title="Planificador de Producción" currentPage={currentPage}>
  {
    !canAccess ? (
      <div class="mx-auto mt-16 max-w-lg px-4">
        <UpgradePrompt
          tier="pro"
          feature="Planificador de producción"
          description="Consolida ingredientes y costos de múltiples recetas en una sola vista. Exclusivo de KitchCalc Pro."
        />
      </div>
    ) : (
      <div class="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <h1 class="text-foreground flex items-center gap-2 text-xl font-bold">
          <Icon name="lucide:factory" size={24} class="text-accent-600" />
          Planificador de Producción
        </h1>

        <ProductionRecipeSelector
          recipes={allRecipes}
          selections={selections}
        />

        {results && (
          <>
            <ProductionIngredientsTable
              ingredients={results.consolidatedIngredients}
            />
            <ProductionFinancialSummary summary={results.summary} />
            <ProductionRecipeBreakdown recipes={results.summary.perRecipe} />
          </>
        )}
      </div>
    )
  }
</Layout>
```

---

## 6. Componentes

### 6.1 `ProductionRecipeSelector.astro`

Lista de todas las recetas con:

- Checkbox para seleccionar (name: `recipe_id[]`)
- Input numérico para batches (name: `batches[]`, min: 0.5, step: 0.5)
- Agrupación visual por categoría
- Botón "Calcular producción" (submit)
- Clase CSS: `.production-selector` (se oculta en `@media print`)

Estados:

- **Vacío:** todas las recetas deseleccionadas, muestra "Selecciona las recetas para planificar tu producción"
- **Seleccionado:** checkbox marcado, input de batches visible
- **Sin recetas en la cuenta:** mensaje "No hay recetas. Crea una receta primero."

### 6.2 `ProductionIngredientsTable.astro`

Tabla de ingredientes consolidados:

| Ingrediente | Cantidad total | Unidad | Costo unitario | Costo total | Recetas |
| ----------- | -------------- | ------ | -------------- | ----------- | ------- |

- Agrupación por `ingredientId`
- Columna "Recetas" muestra badges con nombres de receta y cantidad
- Si dos ingredientes con mismo nombre tienen distintas unidades: filas separadas
- Clase CSS: `.ingredients-table` (visible en print)

Estados:

- **Sin resultados:** no se renderiza (condicional desde el padre)
- **Un solo ingrediente:** tabla normal de 1 fila

### 6.3 `ProductionFinancialSummary.astro`

Grid de 2×2 (o 4 columnas en desktop) con cards de resumen:

```
┌─────────────────────┬─────────────────────┐
│ Costo de insumos    │ Costo operativo     │
│ $45.20              │ $13.56              │
├─────────────────────┼─────────────────────┤
│ Ingresos proyect.   │ Ganancia estimada   │
│ $98.50              │ $39.74 (40.4%)      │
└─────────────────────┴─────────────────────┘
```

- Costo operativo usa el `fixedCostsPercentage` ponderado de las recetas seleccionadas
- Margen efectivo en color verde si >20%, amarillo si >10%, rojo si ≤10%
- Clase CSS: `.financial-summary` (visible en print)

Estados:

- **Sin resultados:** no se renderiza
- **Ingresos sin precio de venta:** muestra "N/A" y no calcula ganancia (advierte al usuario)

### 6.4 `ProductionRecipeBreakdown.astro`

Sección expandible por receta:

- Nombre + categoría + batches
- Tabla de ingredientes de esa receta (con cantidades escaladas)
- Tabla de presentaciones con unidades totales y revenue
- Clase CSS: `.recipe-breakdown` (visible en print)

Estados:

- **Sin resultados:** no se renderiza
- **Receta sin presentaciones:** muestra "Sin presentaciones configuradas"
- **Receta sin ingredientes:** muestra "Esta receta no tiene ingredientes"

---

## 7. Hoja de producción (print-friendly)

Botón "Imprimir" en la sección de resultados:

```html
<button onclick="window.print()" class="...">
  <Icon name="lucide:printer" size="{16}" />
  Imprimir hoja de producción
</button>
```

### 7.1 Estilos `@media print` en `global.css`

```css
@media print {
  header,
  nav,
  .sidebar,
  .mobile-nav,
  .production-selector,
  button,
  .no-print {
    display: none !important;
  }

  body {
    background: white !important;
    color: black !important;
    font-size: 11pt;
  }

  .production-sheet {
    max-width: 100%;
    margin: 0;
    padding: 0;
  }

  .production-sheet table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: auto;
  }

  .production-sheet th,
  .production-sheet td {
    border: 1px solid #ccc;
    padding: 4px 8px;
    text-align: left;
    font-size: 9pt;
  }

  .production-sheet th {
    background: #f5f5f5 !important;
    font-weight: 700;
  }

  .production-sheet tr {
    page-break-inside: avoid;
  }

  .production-sheet .financial-summary {
    page-break-before: always;
  }
}
```

---

## 8. Interacciones y UX

### 8.1 Query params para bookmarking

Preservar selección en URL para compartir/refrescar:

```
/produccion?recipes=101,102&batches=2,1
```

- Leer al cargar página (GET)
- Actualizar al hacer submit (POST → redirect con query params)

### 8.2 Manejo de errores

| Situación                                               | Comportamiento                                |
| ------------------------------------------------------- | --------------------------------------------- |
| Receta seleccionada no existe o no pertenece al usuario | Se omite con warning                          |
| Receta sin ingredientes                                 | Se incluye en desglose con "Sin ingredientes" |
| Receta sin presentaciones                               | Ingreso proyectado muestra "Sin precio"       |
| Ingrediente con cantidad 0                              | Se omite de la tabla consolidada              |
| Usuario Pro en periodo de trial                         | Acceso completo (igual que Pro activo)        |

### 8.3 Loading state

Dado que es SRP (Server Render Pattern), no hay estado de carga client-side. El POST recalcula todo server-side y renderiza la página completa.

---

## 9. Archivos involucrados

| Archivo                                           | Cambio                                                    |
| ------------------------------------------------- | --------------------------------------------------------- |
| `src/pages/produccion.astro`                      | **Nuevo** — página principal del planificador             |
| `src/lib/production-calculator.ts`                | **Nuevo** — lógica de cálculo consolidado                 |
| `src/lib/production-types.ts`                     | **Nuevo** — tipos del planificador                        |
| `src/components/ProductionRecipeSelector.astro`   | **Nuevo** — selector de recetas + batches                 |
| `src/components/ProductionIngredientsTable.astro` | **Nuevo** — tabla de ingredientes consolidados            |
| `src/components/ProductionFinancialSummary.astro` | **Nuevo** — resumen financiero                            |
| `src/components/ProductionRecipeBreakdown.astro`  | **Nuevo** — desglose por receta                           |
| `src/layouts/Layout.astro`                        | Agregar link de navegación condicional (desktop + mobile) |
| `src/styles/global.css`                           | Estilos `@media print` para hoja de producción            |

---

## 10. Verificación

- [ ] `/produccion` redirige a `/sign-in` sin sesión
- [ ] Usuario Free ve `<UpgradePrompt tier="pro">` en lugar del planificador
- [ ] Usuario Basic ve `<UpgradePrompt tier="pro">` en lugar del planificador
- [ ] Usuario Pro ve el selector de recetas completo
- [ ] Seleccionar recetas + batches y calcular muestra resultados correctos
- [ ] Ingredientes repetidos entre recetas se agrupan por `ingredientId`
- [ ] Costos operativos se calculan por receta según `fixedCostsPercentage`
- [ ] Ingresos proyectados suman correctamente las presentaciones × totalUnits
- [ ] Margen efectivo se calcula como `(ganancia / ingresos) × 100`
- [ ] Hoja de producción se imprime sin chrome de navegación
- [ ] Query params preservan selección al refrescar (`?recipes=101,102&batches=2,1`)
- [ ] Navegación sidebar muestra link solo para usuarios Pro
- [ ] Navegación mobile muestra 4 botones para Pro, 3 para Free/Basic
- [ ] Usuario sin recetas: selector muestra estado vacío
- [ ] Receta sin ingredientes: se incluye con warning en desglose
- [ ] Receta sin presentaciones: ingreso proyectado muestra "Sin precio"
- [ ] POST handler omite recetas inválidas (no pertenecen al usuario)
