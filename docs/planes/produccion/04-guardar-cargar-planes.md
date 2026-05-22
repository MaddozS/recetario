# F5: Guardar y cargar planes de producción

> **Prioridad:** 🟠 Alta
> **Dependencias:** F1 (migración Basic, feature gate `production_save`)
> **No depende de F3** (puede implementarse en paralelo con cálculo client-side)
> **Tier:** Pro
> **Feature gate:** `production_save`

---

## Objetivo

Permitir al usuario guardar una configuración de plan de producción con nombre, y cargarla posteriormente para re-ejecutar o modificar. Sin esto, el planificador es una calculadora efímera; con esto, se convierte en una herramienta de trabajo recurrente.

---

## 1. Modelo de datos

### 1.1 Nueva tabla: `production_plans`

```prisma
model ProductionPlan {
  id             Int      @id @default(autoincrement())
  ownerId        String   @map("owner_id") @db.VarChar(36)
  name           String   @db.VarChar(200)
  selectionsJson Json     @map("selections_json")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("production_plans")
  @@index([ownerId])
}
```

- `selectionsJson` almacena `ProductionRecipeSelection[]`
- `name` es definido por el usuario, truncado a 200 caracteres
- `ownerId` vincula al usuario autenticado (multi-tenancy)

### 1.2 Migración

```bash
npx prisma migrate dev --name add_production_plans
npx prisma generate
```

---

## 2. CRUD de planes

### 2.1 `src/lib/db/production-plans.ts`

```ts
import { prisma } from "../prisma";
import type { ProductionRecipeSelection } from "../production-types";
import { cacheSet, cacheGet } from "../cache";

const CACHE_PREFIX = "prod_plans";

function invalidateCache(ownerId: string) {
  cacheSet(`${CACHE_PREFIX}:${ownerId}`, undefined, 0);
}

export type ProductionPlan = {
  id: number;
  ownerId: string;
  name: string;
  selections: ProductionRecipeSelection[];
  createdAt: string;
  updatedAt: string;
};

export async function listPlans(ownerId: string): Promise<ProductionPlan[]> {
  const cached = cacheGet<ProductionPlan[]>(`${CACHE_PREFIX}:${ownerId}`);
  if (cached) return cached;

  const rows = await prisma.productionPlan.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
  });

  const result = rows.map(normalizePlan);
  cacheSet(`${CACHE_PREFIX}:${ownerId}`, result, 30);
  return result;
}

export async function getPlan(
  id: number,
  ownerId: string,
): Promise<ProductionPlan | null> {
  const row = await prisma.productionPlan.findFirst({
    where: { id, ownerId },
  });
  return row ? normalizePlan(row) : null;
}

export async function savePlan(
  name: string,
  selections: ProductionRecipeSelection[],
  ownerId: string,
): Promise<ProductionPlan> {
  const data = await prisma.productionPlan.create({
    data: {
      name: name.trim().slice(0, 200),
      ownerId,
      selectionsJson: JSON.stringify(selections),
    },
  });
  invalidateCache(ownerId);
  return normalizePlan(data);
}

export async function updatePlan(
  id: number,
  name: string,
  selections: ProductionRecipeSelection[],
  ownerId: string,
): Promise<ProductionPlan | null> {
  const existing = await prisma.productionPlan.findFirst({
    where: { id, ownerId },
  });
  if (!existing) return null;

  const data = await prisma.productionPlan.update({
    where: { id },
    data: {
      name: name.trim().slice(0, 200),
      selectionsJson: JSON.stringify(selections),
    },
  });
  invalidateCache(ownerId);
  return normalizePlan(data);
}

export async function deletePlan(
  id: number,
  ownerId: string,
): Promise<boolean> {
  const existing = await prisma.productionPlan.findFirst({
    where: { id, ownerId },
  });
  if (!existing) return false;

  await prisma.productionPlan.delete({ where: { id } });
  invalidateCache(ownerId);
  return true;
}

function normalizePlan(row: any): ProductionPlan {
  const selections: ProductionRecipeSelection[] =
    typeof row.selectionsJson === "string"
      ? JSON.parse(row.selectionsJson as string)
      : (row.selectionsJson as any);
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    selections,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
```

### 2.2 Tipos

Agregar a `src/lib/db/types.ts`:

```ts
export type CreateProductionPlanInput = {
  name: string;
  selections: ProductionRecipeSelection[];
};
```

---

## 3. Componente: `ProductionSavedPlans.astro`

### 3.1 Props

```ts
interface Props {
  plans: ProductionPlan[];
}
```

### 3.2 Template

```astro
---
import { Icon } from "astro-icon/components";
import type { ProductionPlan } from "@/lib/db/production-plans";

const { plans = [] } = Astro.props;
---

<div class="border-border bg-card rounded-2xl border p-6 shadow-sm">
  <h2 class="text-foreground mb-4 text-lg font-bold">Planes guardados</h2>

  {plans.length === 0 ? (
    <p class="text-muted-foreground text-sm">
      No tienes planes guardados. Configura tu producción y guárdala para volver después.
    </p>
  ) : (
    <div class="space-y-2">
      {plans.map((plan) => (
        <div class="border-border hover:bg-muted flex items-center gap-3 rounded-xl border p-3 transition-colors">
          <div class="min-w-0 flex-1">
            <p class="text-foreground text-sm font-semibold">{plan.name}</p>
            <p class="text-muted-foreground text-xs">
              {plan.selections.length} recetas · {timeAgo(plan.updatedAt)}
            </p>
          </div>
          <div class="flex items-center gap-1">
            <!-- Cargar -->
            <a
              href={`/produccion?recipes=${plan.selections.map(s => s.recipeId).join(',')}&batches=${plan.selections.map(s => s.batches).join(',')}${plan.selections.some(s => s.presentationId) ? '&presentations=' + plan.selections.map(s => s.presentationId ?? '').join(',') : ''}`}
              class="bg-accent-600 hover:bg-accent-700 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors"
            >
              <Icon name="lucide:play" size={12} />
              Cargar
            </a>
            <!-- Eliminar -->
            <form method="post" class="inline">
              <input type="hidden" name="_action" value="delete-plan" />
              <input type="hidden" name="plan_id" value={plan.id} />
              <button
                type="submit"
                class="hover:bg-danger-bg text-muted-foreground hover:text-danger inline-flex min-h-9 items-center justify-center rounded-lg px-2 py-1.5 transition-colors"
              >
                <Icon name="lucide:trash-2" size={14} />
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## 4. Integración en `produccion.astro`

### 4.1 Frontmatter

```astro
---
import { listPlans, savePlan, deletePlan } from "../lib/db/production-plans";
import { hasFeature } from "../lib/subscription";
import ProductionSavedPlans from "../components/ProductionSavedPlans.astro";

const canSave = hasFeature(subscription, "production_save");

// Cargar planes guardados
const savedPlans = canSave ? await listPlans(ownerId) : [];

// Manejar POST para guardar/eliminar planes
if (canSave && Astro.request.method === "POST") {
  const formData = await Astro.request.formData();
  const action = formData.get("_action");

  if (action === "save-plan") {
    const name = String(formData.get("plan_name") ?? "").trim();
    if (name) {
      // Reconstruir selections desde query params o form
      const recipeIds = formData.getAll("plan_recipe_id").map(Number);
      const batches = formData.getAll("plan_batch").map(Number);
      const presIds = formData.getAll("plan_pres_id").map(Number);
      const selections: ProductionRecipeSelection[] = recipeIds.map((id, i) => ({
        recipeId: id,
        batches: batches[i] || 1,
        presentationId: Number.isFinite(presIds[i]) ? presIds[i] : undefined,
      }));
      await savePlan(name, selections, ownerId);
      return Astro.redirect("/produccion?type=success&message=Plan+guardado");
    }
  }

  if (action === "delete-plan") {
    const planId = Number(formData.get("plan_id"));
    await deletePlan(planId, ownerId);
    return Astro.redirect("/produccion?type=success&message=Plan+eliminado");
  }
}
---
```

### 4.2 Template — Sección de guardado

```astro
{canSave && selections.length > 0 && (
  <div class="border-border bg-card rounded-2xl border p-6 shadow-sm">
    <h2 class="text-foreground mb-4 text-lg font-bold">Guardar plan actual</h2>
    <form method="post" class="flex gap-3">
      <input type="hidden" name="_action" value="save-plan" />
      <!-- Hidden fields con las selecciones actuales -->
      {selections.map((sel) => (
        <>
          <input type="hidden" name="plan_recipe_id" value={sel.recipeId} />
          <input type="hidden" name="plan_batch" value={sel.batches} />
          {sel.presentationId && (
            <input type="hidden" name="plan_pres_id" value={sel.presentationId} />
          )}
        </>
      ))}
      <input
        type="text"
        name="plan_name"
        placeholder="Nombre del plan (ej. Producción semanal)"
        maxlength={200}
        required
        class="border-border bg-background text-foreground flex-1 rounded-xl border px-4 py-2.5 text-sm"
      />
      <button
        type="submit"
        class="bg-accent-600 hover:bg-accent-700 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-colors"
      >
        <Icon name="lucide:save" size={16} />
        Guardar
      </button>
    </form>
  </div>
)}
```

### 4.3 Template — Planes guardados

Arriba del selector, mostrar los planes guardados:

```astro
{canSave && savedPlans.length > 0 && (
  <ProductionSavedPlans plans={savedPlans} />
)}
```

---

## 5. Límite de planes guardados

Para evitar abuso, limitar a **20 planes por usuario** en Pro:

```ts
const MAX_SAVED_PLANS = 20;

export async function savePlan(...) {
  const count = await prisma.productionPlan.count({ where: { ownerId } });
  if (count >= MAX_SAVED_PLANS) {
    throw new Error("Límite de 20 planes guardados alcanzado");
  }
  // ...
}
```

---

## 6. Arquitectura de flujo

```
Usuario configura producción
        │
        ▼
  [Calcula resultados]
        │
        ▼
  [Botón "Guardar plan"] → Modal/nombre → POST savePlan → Redirect
        │
        ▼
  Al volver a /produccion:
        │
        ▼
  [Planes guardados] → Click "Cargar" → Navega a /produccion?recipes=...&batches=...
        │
        ▼
  Selector se rellena automáticamente desde query params (comportamiento existente)
```

---

## 7. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Nuevo modelo `ProductionPlan` |
| `src/lib/db/production-plans.ts` | **Nuevo** — CRUD de planes |
| `src/lib/db/types.ts` | Nuevo tipo `CreateProductionPlanInput` |
| `src/lib/db/index.ts` | Exportar `production-plans` |
| `src/lib/recipe-data.ts` | Re-exportar (automático vía barrel) |
| `src/components/ProductionSavedPlans.astro` | **Nuevo** — lista de planes guardados |
| `src/pages/produccion.astro` | Formulario de guardado, POST handlers, integrar componente |
| `src/lib/cache.ts` | (sin cambios, reutilizado) |

---

## 8. Verificación

- [ ] Tabla `production_plans` existe en DB con columnas correctas
- [ ] Usuario Pro puede guardar un plan con nombre
- [ ] El plan guardado incluye recipeIds, batches y presentationIds
- [ ] Usuario Pro ve sus planes guardados al cargar `/produccion`
- [ ] Click en "Cargar" rellena el selector con las recetas y batches del plan
- [ ] Usuario Pro puede eliminar un plan guardado
- [ ] Usuario Pro puede sobreescribir un plan existente (guardar con mismo nombre)
- [ ] Límite de 20 planes por usuario
- [ ] Usuario Basic NO ve la sección de guardar ni planes guardados (`production_save: false`)
- [ ] Los planes son multi-tenant (cada usuario solo ve los suyos)
- [ ] Cache se invalida al crear/eliminar un plan
- [ ] Planes se ordenan por `updatedAt` descendente (más reciente primero)
