# Orquestador: Implementacion de Monetizacion por Suscripciones

## Vision General

Este documento coordina la implementacion completa del modelo de suscripciones Freemium para KitchCalc. Se divide en 7 modulos independientes que pueden ser implementados secuencialmente o en paralelo por subagentes.

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE PRESENTACION                      │
│  /pricing              /settings/billing    UpgradePrompt    │
│  (comparativa)         (gestion suscripcion) (modal CTA)     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE NEGOCIO                           │
│  Feature Gates: hasFeature()   canCreateRecipe()            │
│  Billing DB: getUserSubscription()  seedPlans()             │
│  Counts: countUserRecipes()  countUserIngredients()         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE INTEGRACION                       │
│  /api/stripe/checkout        /api/stripe/webhook           │
│  /api/stripe/portal                                         │
│  Stripe SDK ( Node.js )                                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     CAPA DE DATOS                             │
│  subscription_plans (seeded)   subscriptions (por usuario)  │
│  recipes (existe) + count     ingredients (existe) + count  │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

```
1. Usuario hace clic en "Suscribirse" en /pricing
   -> POST /api/stripe/checkout (priceId, successUrl, cancelUrl)
   -> Stripe Checkout Session (hosted page)
   -> Usuario paga
   -> Stripe redirige a successUrl
   -> Stripe envia webhook `checkout.session.completed`
   -> /api/stripe/webhook crea/actualiza fila en subscriptions
   -> Usuario redirigido a /settings/billing

2. Usuario navega por la app
   -> Middleware lee subscription de DB
   -> Inyecta en Astro.locals.subscription
   -> Feature gates deciden que mostrar/ocultar
   -> Limit checks bloquean creacion si se excede
```

## Modulos

| #   | Modulo                       | Archivo de Plan                | Dependencias          | Estimacion |
| --- | ---------------------------- | ------------------------------ | --------------------- | ---------- |
| 1   | **DB Billing Layer**         | `modulo-1-db-billing.md`       | Schema ya creado (v5) | 1-2h       |
| 2   | **Stripe API Routes**        | `modulo-2-stripe-routes.md`    | Modulo 1              | 2-3h       |
| 3   | **Middleware + Gates**       | `modulo-3-middleware-gates.md` | Modulo 1              | 1-2h       |
| 4   | **Pagina /pricing**          | `modulo-4-pagina-pricing.md`   | Modulo 3              | 1-2h       |
| 5   | **Pagina /settings/billing** | `modulo-5-pagina-billing.md`   | Modulos 1, 2, 3       | 1-2h       |
| 6   | **Limites en CRUD**          | `modulo-6-limites.md`          | Modulo 3              | 1-2h       |
| 7   | **Upgrade Prompt**           | `modulo-7-upgrade-prompt.md`   | Modulo 3              | 30min      |

## Orden de Implementacion Recomendado

**Opcion A: Secuencial (mas seguro)**

```
Modulo 1 -> Modulo 3 -> Modulo 2 -> Modulo 6 -> Modulo 7 -> Modulo 4 -> Modulo 5
```

**Opcion B: Parcialmente Paralelo**

```
Fase 1 (backend): Modulo 1 + Modulo 2 + Modulo 3 (paralelo)
Fase 2 (frontend): Modulo 6 + Modulo 7 + Modulo 4 + Modulo 5 (paralelo)
```

> Recomendacion: Usar **Opcion A** para evitar conflictos de merge. Cada modulo se entrega en un commit separado.

## Convenciones Transversales

### Nombres de Tablas

- `subscription_plans` - planes estaticos (seeded)
- `subscriptions` - suscripciones activas por usuario

### Nombres de Tier

- `'free'` - implicito (sin fila en subscriptions = free)
- `'basic'` - plan basico
- `'pro'` - plan profesional

### Feature Flags JSON (features_json en subscription_plans)

```json
{
  "production_planner": false,
  "pdf_export": false,
  "advanced_costs": false,
  "change_history": false,
  "data_import_export": false,
  "nutrition_info": false,
  "stock_tracking": false,
  "recipe_photos": false,
  "recipe_duplicate": false
}
```

### Limites

| Tier  | recipes_limit    | ingredients_limit |
| ----- | ---------------- | ----------------- |
| free  | 10               | 30                |
| basic | 75               | null (unlimited)  |
| pro   | null (unlimited) | null (unlimited)  |

### Stripe Price IDs (ya configurados en .env)

```
STRIPE_PRICE_ID_BASIC_MONTHLY=price_1TUdQX2dmlfcb4EFdlCYjaqK
STRIPE_PRICE_ID_BASIC_YEARLY=price_1TUdUf2dmlfcb4EF5DPLAvqg
STRIPE_PRICE_ID_PRO_MONTHLY=price_1TUdWM2dmlfcb4EFtCWByA7B
STRIPE_PRICE_ID_PRO_YEARLY=price_1TUdWd2dmlfcb4EFf9MDbBDg
```

## Estructura de Archivos a Crear/Modificar

### Nuevos archivos

```
src/lib/db/billing.ts           # Modulo 1
src/lib/db/counts.ts            # Modulo 1 (opcional, puede ir en billing.ts)
src/lib/subscription.ts         # Modulo 3 (feature gates)
src/pages/api/stripe/checkout.ts # Modulo 2
src/pages/api/stripe/webhook.ts  # Modulo 2
src/pages/api/stripe/portal.ts   # Modulo 2
src/pages/pricing.astro         # Modulo 4
src/pages/settings/billing.astro # Modulo 5
src/components/UpgradePrompt.astro # Modulo 7
```

### Archivos a modificar

```
src/lib/db/index.ts             # Exportar billing
src/lib/db/connection.ts        # Ya modificado (schema v5)
src/middleware.ts               # Inyectar subscription
src/env.d.ts                    # Tipos de locals.subscription
src/pages/recipes/index.astro   # Validar limite recetas
src/pages/ingredients.astro     # Validar limite ingredientes
src/components/Header.astro     # Opcional: badge de plan
src/components/RecipesSidebar.astro # Opcional: badge de plan
src/pages/settings.astro        # Link a /settings/billing
```

## Checklist de Pre-condiciones

Antes de que cualquier subagente empiece:

- [ ] `stripe` package instalado (`pnpm add stripe`)
- [ ] Variables de entorno configuradas en `.env`
- [ ] Schema v5 aplicado (tablas subscription_plans, subscriptions creadas)
- [ ] Stripe products y prices creados en Dashboard
- [ ] Price IDs copiados al `.env`

## Verificacion Post-Implementacion

1. `pnpm astro check` - Type checking
2. `pnpm eslint .` - Linting
3. `pnpm build` - Build de produccion
4. Flujo manual: registro -> crear recetas -> upgrade -> verificar plan activo

## Notas para Subagentes

- **SIEMPRE** usar `import { ... } from "../lib/recipe-data"` para DB access
- **SIEMPRE** soportar ambos backends: Postgres y SQLite
- **SIEMPRE** seguir convenciones de UI del proyecto (rounded-2xl, accent-\*, etc.)
- **SIEMPRE** agregar `transition:animate="none"` a elementos estaticos
- **NUNCA** hardcodear Price IDs, usar variables de entorno
- **NUNCA** modificar logica de auth (Better Auth)

## Planes Seed (Valores Exactos)

Los 4 planes deben insertarse via `seedSubscriptionPlans()`:

| id              | stripe_price_id                 | name            | tier  | interval | price_cents | recipes | ingredients | features_json                                                        |
| --------------- | ------------------------------- | --------------- | ----- | -------- | ----------- | ------- | ----------- | -------------------------------------------------------------------- |
| `basic_monthly` | `STRIPE_PRICE_ID_BASIC_MONTHLY` | KitchCalc Basic | basic | monthly  | 500         | 75      | null        | `{recipe_duplicate:true,stock_tracking:true,recipe_photos:true,...}` |
| `basic_yearly`  | `STRIPE_PRICE_ID_BASIC_YEARLY`  | KitchCalc Basic | basic | yearly   | 4800        | 75      | null        | (igual)                                                              |
| `pro_monthly`   | `STRIPE_PRICE_ID_PRO_MONTHLY`   | KitchCalc Pro   | pro   | monthly  | 1000        | null    | null        | `{production_planner:true,pdf_export:true,...}`                      |
| `pro_yearly`    | `STRIPE_PRICE_ID_PRO_YEARLY`    | KitchCalc Pro   | pro   | yearly   | 8400        | null    | null        | (igual)                                                              |

Free = no subscription row = `tier: 'free'`, `recipes_limit: 10`, `ingredients_limit: 30`
