# Modulo 3: Middleware + Feature Gates

## Objetivo

Inyectar la suscripcion del usuario en `Astro.locals` y crear utilidades para verificar features y limites.

## Archivos a Crear

### 1. `src/lib/subscription.ts`

Este archivo contiene toda la logica de negocio para feature gating.

#### Tipos

```typescript
export type SubscriptionTier = "free" | "basic" | "pro";

export type UserSubscriptionInfo = {
  tier: SubscriptionTier;
  status:
    | "active"
    | "trialing"
    | "canceled"
    | "past_due"
    | "unpaid"
    | "incomplete"
    | null;
  recipesLimit: number | null;
  ingredientsLimit: number | null;
  features: Record<string, boolean>;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isTrial: boolean;
};
```

#### `getDefaultSubscription(): UserSubscriptionInfo`

Retorna la suscripcion por defecto (Free):

```typescript
{
  tier: 'free',
  status: null,
  recipesLimit: 10,
  ingredientsLimit: 30,
  features: {
    recipe_duplicate: false,
    recipe_photos: false,
    stock_tracking: false,
    production_planner: false,
    pdf_export: false,
    advanced_costs: false,
    change_history: false,
    data_import_export: false,
    nutrition_info: false,
  },
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isTrial: false,
}
```

#### `resolveSubscription(sub: DBSubscription | null): UserSubscriptionInfo`

Convierte una suscripcion de DB al formato de negocio. Si es null, retorna `getDefaultSubscription()`.

#### `hasFeature(subscription: UserSubscriptionInfo, feature: string): boolean`

Verifica si un feature esta habilitado:

```typescript
export function hasFeature(
  subscription: UserSubscriptionInfo,
  feature: string,
): boolean {
  return subscription.features[feature] === true;
}
```

#### `canCreateRecipe(subscription: UserSubscriptionInfo, currentCount: number): boolean`

Verifica si el usuario puede crear una receta mas:

```typescript
export function canCreateRecipe(
  subscription: UserSubscriptionInfo,
  currentCount: number,
): boolean {
  if (subscription.recipesLimit === null) return true; // unlimited
  return currentCount < subscription.recipesLimit;
}
```

#### `canCreateIngredient(subscription: UserSubscriptionInfo, currentCount: number): boolean`

Verifica si el usuario puede crear un ingrediente mas:

```typescript
export function canCreateIngredient(
  subscription: UserSubscriptionInfo,
  currentCount: number,
): boolean {
  if (subscription.ingredientsLimit === null) return true; // unlimited
  return currentCount < subscription.ingredientsLimit;
}
```

#### `getRemainingRecipes(subscription: UserSubscriptionInfo, currentCount: number): number | null`

Retorna cuantas recetas le quedan (null = unlimited):

```typescript
export function getRemainingRecipes(
  subscription: UserSubscriptionInfo,
  currentCount: number,
): number | null {
  if (subscription.recipesLimit === null) return null;
  return Math.max(0, subscription.recipesLimit - currentCount);
}
```

#### `getRemainingIngredients(subscription: UserSubscriptionInfo, currentCount: number): number | null`

Similar para ingredientes.

#### `isPaid(subscription: UserSubscriptionInfo): boolean`

Retorna true si tier es basic o pro.

#### `isPro(subscription: UserSubscriptionInfo): boolean`

Retorna true si tier es pro.

## Archivos a Modificar

### 2. `src/middleware.ts`

**Cambio:** Enriquecer `Astro.locals` con informacion de suscripcion.

**Nuevo middleware:**

```typescript
import { auth } from "./lib/auth";
import { defineMiddleware } from "astro:middleware";
import { getUserSubscription } from "./lib/recipe-data";
import { resolveSubscription } from "./lib/subscription";

export const onRequest = defineMiddleware(async (context, next) => {
  // Auth existente
  try {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });
    if (session?.session && session?.user) {
      context.locals.user = session.user;
      context.locals.session = session.session;

      // NUEVO: Cargar suscripcion
      const dbSub = await getUserSubscription(session.user.id);
      context.locals.subscription = resolveSubscription(dbSub);
    } else {
      context.locals.user = null;
      context.locals.session = null;
      context.locals.subscription = resolveSubscription(null);
    }
  } catch (error) {
    context.locals.user = null;
    context.locals.session = null;
    context.locals.subscription = resolveSubscription(null);
  }

  return next();
});
```

### 3. `src/env.d.ts`

**Cambio:** Agregar tipo de `subscription` a `Locals`.

```typescript
declare namespace App {
  interface Locals {
    user: import("better-auth").User | null;
    session: import("better-auth").Session | null;
    subscription: import("./lib/subscription").UserSubscriptionInfo;
  }
  // ... resto de interfaces
}
```

### 4. `src/lib/db/billing.ts` (dependencia)

Asegurar que `getUserSubscription` esta implementado y exportado desde `src/lib/db/index.ts`.

## Feature Map Completo

| Feature              | Free  | Basic | Pro  |
| -------------------- | ----- | ----- | ---- |
| `recipe_duplicate`   | false | true  | true |
| `recipe_photos`      | false | true  | true |
| `stock_tracking`     | false | true  | true |
| `production_planner` | false | false | true |
| `pdf_export`         | false | false | true |
| `advanced_costs`     | false | false | true |
| `change_history`     | false | false | true |
| `data_import_export` | false | false | true |
| `nutrition_info`     | false | false | true |

## Uso en Componentes Astro

```astro
---
import { hasFeature, canCreateRecipe } from "../lib/subscription";
import { countUserRecipes } from "../lib/recipe-data";

const subscription = Astro.locals.subscription;
const recipeCount = await countUserRecipes(recipeDataOwner);

const canCreate = canCreateRecipe(subscription, recipeCount);
const canExportPdf = hasFeature(subscription, "pdf_export");
---

{
  !canCreate && (
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
      Has alcanzado el limite de {subscription.recipesLimit} recetas.
      <a href="/pricing" class="text-accent-600 font-bold">
        Actualizar plan
      </a>
    </div>
  )
}

{canExportPdf && <button>Exportar PDF</button>}
```

## Uso en API Routes

```typescript
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals }) => {
  const { subscription } = locals;

  if (!hasFeature(subscription, "production_planner")) {
    return new Response("Feature not available", { status: 403 });
  }

  // ... procesar
};
```

## Consideraciones

1. **Performance:** `getUserSubscription` se ejecuta en cada request. Considerar caching en memoria (Map) con TTL de 5 minutos.
2. **Tipo de features_json:** En SQLite es TEXT, en Postgres es JSONB. Ambos se parsean con `JSON.parse()`.
3. **Null safety:** Siempre asumir que `subscription` puede ser la version Free (default).

## Testing

1. Verificar que `Astro.locals.subscription` existe en todas las paginas
2. Verificar que un usuario sin suscripcion tiene tier 'free'
3. Verificar que `hasFeature(freeSub, 'pdf_export')` retorna false
4. Verificar que `canCreateRecipe(freeSub, 10)` retorna false
5. Verificar que `canCreateRecipe(freeSub, 9)` retorna true

## Archivos de Salida

- `src/lib/subscription.ts` (nuevo)
- `src/middleware.ts` (modificado)
- `src/env.d.ts` (modificado)
