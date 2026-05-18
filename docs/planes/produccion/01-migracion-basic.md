# F1: Migración a Basic + Límite de recetas

> **Prioridad:** 🔴 Crítica
> **Dependencias:** Ninguna
> **Tier:** Basic (acceso), Pro (sin límite)
> **Feature gates:** `production_planner`, `production_save`, `production_advanced`
> **Estado:** ✅ Implementado — 2026-05-17

---

## Objetivo

1. Cambiar `production_planner` de Pro-exclusivo a **Basic+**
2. Agregar dos nuevos feature gates: `production_save` y `production_advanced`
3. Limitar a **3 recetas por plan** para usuarios Basic
4. Mostrar `<UpgradePrompt tier="pro">` al exceder el límite

---

## 1. Cambios en feature gates

### 1.1 `src/lib/db/billing.ts`

```diff
const BASIC_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
- production_planner: false,
+ production_planner: true,
+ production_save: false,
+ production_advanced: false,
  pdf_export: false,
  advanced_costs: false,
  change_history: false,
  data_import_export: false,
  nutrition_info: false,
  cooking_mode: false,
};

const PRO_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: true,
+ production_save: true,
+ production_advanced: true,
  pdf_export: true,
  advanced_costs: true,
  change_history: true,
  data_import_export: true,
  nutrition_info: true,
  cooking_mode: true,
};
```

### 1.2 `src/lib/subscription.ts`

```diff
const FREE_FEATURES: Record<string, boolean> = {
  recipe_duplicate: false,
  recipe_photos: false,
  stock_tracking: false,
  production_planner: false,
+ production_save: false,
+ production_advanced: false,
  pdf_export: false,
  advanced_costs: false,
  change_history: false,
  data_import_export: false,
  nutrition_info: false,
  cooking_mode: false,
};
```

### 1.3 Migración de base de datos

Crear migración de Prisma para actualizar la columna `featuresJson` de los planes `basic_monthly`, `basic_yearly`, `pro_monthly`, `pro_yearly` existentes:

```sql
-- Agregar nuevos flags a featuresJson de planes existentes
UPDATE subscription_plans
SET features_json = jsonb_set(
  jsonb_set(
    jsonb_set(
      features_json,
      '{production_planner}',
      CASE WHEN tier = 'basic' OR tier = 'pro' THEN 'true'::jsonb ELSE 'false'::jsonb END
    ),
    '{production_save}',
    CASE WHEN tier = 'pro' THEN 'true'::jsonb ELSE 'false'::jsonb END
  ),
  '{production_advanced}',
  CASE WHEN tier = 'pro' THEN 'true'::jsonb ELSE 'false'::jsonb END
)
WHERE tier IN ('basic', 'pro');
```

Alternativa más simple: re-seedear los planes llamando `seedSubscriptionPlans()` en el middleware (ya se ejecuta automáticamente en el primer request autenticado). Los `upsert` existentes actualizarán `featuresJson` con los nuevos valores.

---

## 2. Límite de recetas en `/produccion`

### 2.1 Constante de límite

```ts
// src/lib/constants.ts (agregar)
export const PRODUCTION_BASIC_RECIPE_LIMIT = 3;
```

### 2.2 Lógica en `produccion.astro`

```astro
---
import { isPro } from "../lib/subscription";
import { PRODUCTION_BASIC_RECIPE_LIMIT } from "../lib/constants";
// ...

const isProUser = isPro(subscription);
const maxRecipes = isProUser ? Infinity : PRODUCTION_BASIC_RECIPE_LIMIT;

// Al validar selecciones en POST:
if (!isProUser && validSelections.length > PRODUCTION_BASIC_RECIPE_LIMIT) {
  // Truncar a las primeras 3 y mostrar advertencia
  validSelections = validSelections.slice(0, PRODUCTION_BASIC_RECIPE_LIMIT);
  // Agregar query param ?upgrade=1 para mostrar el prompt
}
---
```

### 2.3 UI en el selector

En `ProductionRecipeSelector.astro`, recibir nueva prop `maxRecipes`:

```astro
---
interface Props {
  recipes: RecipeSummary[];
  selections: ProductionRecipeSelection[];
  recipePresentations?: Map<number, PresentationOption[]>;
  maxRecipes: number; // Infinity para Pro, 3 para Basic
}
---

<!-- Si no es Pro y ya hay 3 seleccionadas, deshabilitar checkboxes restantes -->
<input
  type="checkbox"
  name="recipe_id"
  value={recipe.id}
  disabled={!isProUser && selectedIds.size >= maxRecipes && !isSelected}
  ...
/>

<!-- Mostrar banner de upgrade al llegar al límite -->
{!isProUser && selectedIds.size >= maxRecipes && (
  <div class="border-warning-border bg-warning-bg rounded-xl border p-4">
    <p class="text-warning text-sm font-semibold">
      Límite de {maxRecipes} recetas alcanzado en plan Basic.
    </p>
    <a href="/pricing" class="text-accent-600 text-sm font-bold">
      Actualizar a Pro para planificar recetas ilimitadas →
    </a>
  </div>
)}
```

### 2.4 Upgrade prompt en resultados

Si el usuario Basic fuerza más de 3 recetas vía query params manipulados, mostrar el `<UpgradePrompt>` en lugar de los resultados:

```astro
{
  !isProUser && selections.length > PRODUCTION_BASIC_RECIPE_LIMIT ? (
    <UpgradePrompt
      tier="pro"
      feature="Planificador de producción sin límites"
      description="El plan Basic permite hasta 3 recetas por plan de producción. Actualiza a Pro para planificar recetas ilimitadas, guardar planes, lista de compras y más."
    />
  ) : (
    results && (<>...</>)
  )
}
```

---

## 3. Actualizar UpgradePrompt para Free

Actualmente Free ve:

```
tier="pro"
feature="Planificador de producción"
```

Debe cambiarse a:

```
tier="basic"
feature="Planificador de producción"
description="Planifica hasta 3 recetas simultáneas y obtén costos consolidados, ingredientes totales y hoja de producción imprimible."
```

---

## 4. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/lib/db/billing.ts` | `production_planner: true` en Basic, 2 nuevos flags |
| `src/lib/subscription.ts` | 2 nuevos flags en `FREE_FEATURES` |
| `src/lib/constants.ts` | Nueva constante `PRODUCTION_BASIC_RECIPE_LIMIT` |
| `src/pages/produccion.astro` | Límite de 3 recetas, upgrade prompts, cambio de tier para Free |
| `src/components/ProductionRecipeSelector.astro` | Nueva prop `maxRecipes`, checkboxes deshabilitados, banner de upgrade |
| `prisma/schema.prisma` | Migración (o re-seed automático) |

---

## 5. Verificación

- [ ] `production_planner` es `true` para Basic (confirmar en `BASIC_FEATURES`)
- [ ] `production_save` y `production_advanced` son `false` para Basic y Free
- [ ] `production_save` y `production_advanced` son `true` para Pro
- [ ] `FREE_FEATURES` tiene los 3 flags en `false`
- [ ] Usuario Free visita `/produccion` → ve `<UpgradePrompt tier="basic">`
- [ ] Usuario Basic visita `/produccion` → ve el planificador completo
- [ ] Usuario Basic selecciona 3 recetas → checkboxes restantes se deshabilitan
- [ ] Usuario Basic selecciona 3 recetas → aparece banner "Actualizar a Pro"
- [ ] Usuario Basic fuerza >3 vía query params → ve `<UpgradePrompt tier="pro">`
- [ ] Usuario Pro no tiene límite de recetas
- [ ] Planes de suscripción existentes en DB tienen los nuevos flags en `featuresJson`
