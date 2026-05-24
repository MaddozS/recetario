# Modulo 1: DB Billing Layer

## Objetivo

Crear la capa de acceso a datos para billing: seed de planes, consulta de suscripcion activa, y conteo de recursos (recetas/ingredientes) por usuario.

## Archivos a Crear

### 1. `src/lib/db/billing.ts`

Este archivo contiene todas las funciones CRUD para billing.

#### Funciones Requeridas

##### `seedSubscriptionPlans()`

**Proposito:** Insertar los 4 planes estaticos en `subscription_plans` si no existen.

**Logica:**

1. Leer los 4 Price IDs de variables de entorno
2. Para cada plan, hacer INSERT con `ON CONFLICT (id) DO NOTHING`
3. Manejar ambos backends (Postgres y SQLite)

**Features JSON por plan:**

**Basic:**

```json
{
  "recipe_duplicate": true,
  "recipe_photos": true,
  "stock_tracking": true,
  "production_planner": true,
  "production_save": false,
  "production_advanced": false,
  "pdf_export": false,
  "advanced_costs": false,
  "change_history": false,
  "data_import_export": false,
  "nutrition_info": false,
  "cooking_mode": false
}
```

**Pro:**

```json
{
  "recipe_duplicate": true,
  "recipe_photos": true,
  "stock_tracking": true,
  "production_planner": true,
  "pdf_export": true,
  "advanced_costs": true,
  "change_history": true,
  "data_import_export": true,
  "nutrition_info": true
}
```

##### `getUserSubscription(userId: string)`

**Proposito:** Obtener la suscripcion activa de un usuario.

**Query (Postgres):**

```sql
SELECT s.*, sp.tier, sp.recipes_limit, sp.ingredients_limit, sp.features_json
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE s.user_id = $1
  AND s.status IN ('active', 'trialing')
ORDER BY s.created_at DESC
LIMIT 1
```

**Query (SQLite):**

```sql
SELECT s.*, sp.tier, sp.recipes_limit, sp.ingredients_limit, sp.features_json
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE s.user_id = ?
  AND s.status IN ('active', 'trialing')
ORDER BY s.created_at DESC
LIMIT 1
```

**Retorno:**

```typescript
type UserSubscription = {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planId: string;
  status:
    | "active"
    | "canceled"
    | "past_due"
    | "trialing"
    | "unpaid"
    | "incomplete";
  tier: "basic" | "pro";
  recipesLimit: number | null;
  ingredientsLimit: number | null;
  features: Record<string, boolean>;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  createdAt: Date;
} | null;
```

Si no hay fila, retornar `null` (significa tier `free`).

##### `createOrUpdateSubscription(data)`

**Proposito:** Crear o actualizar una suscripcion desde webhook.

**Parametros:**

```typescript
{
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | null;
}
```

**Logica:**

- Postgres: `INSERT ... ON CONFLICT (stripe_subscription_id) DO UPDATE SET ...`
- SQLite: `INSERT ... ON CONFLICT(stripe_subscription_id) DO UPDATE SET ...`

##### `cancelSubscription(stripeSubscriptionId: string)`

**Proposito:** Marcar suscripcion como cancelada (desde webhook).

**Logica:**

```sql
UPDATE subscriptions
SET status = 'canceled', cancel_at_period_end = true
WHERE stripe_subscription_id = $1
```

##### `countUserRecipes(ownerId: string)`

**Proposito:** Contar cuantas recetas tiene un usuario.

**Query:**

```sql
SELECT COUNT(*) as count FROM recipes WHERE owner_id = $1
```

**Retorno:** `number`

##### `countUserIngredients(ownerId: string)`

**Proposito:** Contar cuantos ingredientes tiene un usuario.

**Query:**

```sql
SELECT COUNT(*) as count FROM ingredients WHERE owner_id = $1
```

**Retorno:** `number`

### 2. `src/lib/db/index.ts` (Modificar)

Agregar export:

```typescript
export * from "./billing";
```

## Esquema de Datos (Recordatorio)

Las tablas ya fueron creadas en `connection.ts` (schema v5):

**subscription_plans:**

- `id` TEXT PRIMARY KEY
- `stripe_price_id` TEXT UNIQUE NOT NULL
- `name` TEXT NOT NULL
- `tier` TEXT CHECK (basic, pro)
- `billing_interval` TEXT CHECK (monthly, yearly)
- `price_cents` INTEGER NOT NULL
- `recipes_limit` INTEGER (nullable)
- `ingredients_limit` INTEGER (nullable)
- `features_json` JSONB (Postgres) / TEXT (SQLite)
- `created_at` TIMESTAMP

**subscriptions:**

- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL
- `stripe_customer_id` TEXT
- `stripe_subscription_id` TEXT UNIQUE
- `plan_id` TEXT REFERENCES subscription_plans(id)
- `status` TEXT CHECK (active, canceled, past_due, trialing, unpaid, incomplete)
- `current_period_start` TIMESTAMP
- `current_period_end` TIMESTAMP
- `cancel_at_period_end` BOOLEAN DEFAULT false
- `trial_end` TIMESTAMP
- `created_at` TIMESTAMP

## Consideraciones de Backend Dual

### Postgres

- Usar `$1, $2` para parametros
- Usar `::text` para casts de numeric
- JSONB para features_json (puede parsearse con `JSON.parse`)

### SQLite

- Usar `?` para parametros
- TEXT para features_json (siempre parsear con `JSON.parse`)
- Booleanos como INTEGER (0/1)

## Testing Manual

1. Ejecutar `seedSubscriptionPlans()` al iniciar la app
2. Verificar que las 4 filas existen en `subscription_plans`
3. Probar `getUserSubscription('usuario_inexistente')` -> null
4. Probar `countUserRecipes('__static_seed__')` -> 7
5. Probar `countUserIngredients('__static_seed__')` -> ~30

## Dependencias

- `src/lib/db/connection.ts` (getDriver, ensureInitialized)
- `src/lib/db/helpers.ts` (requireOwnerId)
- Variables de entorno (STRIPE*PRICE_ID*\*)

## Archivos de Salida

- `src/lib/db/billing.ts` (nuevo)
- `src/lib/db/index.ts` (modificado, agregar export)
