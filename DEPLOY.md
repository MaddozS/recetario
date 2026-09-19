# Deploy — Cloudflare

KitchCalc corre en dos Cloudflare **Workers** (el web ya no usa Pages ni KV) con Prisma Postgres:

| Worker                               | Qué corre                                                                    | URL                         |
| ------------------------------------ | ---------------------------------------------------------------------------- | --------------------------- |
| `recetario-web-{staging,production}` | Nuxt 4 + Nitro (`cloudflare_module`), Workers Assets + service binding `API` | `https://app.kitchcalc.com` |
| `recetario-api-{staging,production}` | Hono (Better Auth, CSRF, límites)                                            | `https://api.kitchcalc.com` |
| Database                             | Prisma Postgres (free tier)                                                  | vía `DATABASE_URL`          |

## Prerequisites

- Node `>= 22.23.1`, pnpm `11.1.2` (locked via `packageManager` field)
- `pnpm install` — el `postinstall` genera el cliente Prisma
- Wrangler autenticado: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (lo que usa CI) o `pnpm dlx wrangler@4 login` en local
- Account ID: `5f065700ca8d436da492ff3b73d0cc05`
- Stripe account (for billing), Google OAuth credentials, Resend API key (for password reset emails)

## Deploy automático (`deploy.yml`)

Un único workflow dispara en `push` a `dev` (→ staging) o `master` (→ production) con jobs encadenados:

1. **`verify`** — reusa `ci.yml` vía `workflow_call`: lint, type-check, tests, build, e2e (3 navegadores) y `wrangler deploy --dry-run` + guard de bundle. Si algo falla, **no se despliega nada**.
2. **`deploy-api`** — `prisma migrate deploy` → `seed:plans` → `turbo build --filter=@recetario/api` → `wrangler deploy --env=staging|production`.
3. **`deploy-web`** — `turbo build --filter=@recetario/web` (sin Prisma) → `wrangler deploy --env=staging|production`.

El API se despliega **antes** que el web para que los contratos que consume ya estén arriba. Un push nuevo espera a que termine el deploy en curso (concurrency por rama, sin cancelar).

## Deploy manual

```bash
# Web (artefacto Nitro: .output/server + .output/public)
pnpm --filter @recetario/web build
pnpm --filter @recetario/web exec wrangler deploy --env staging    # o production

# API
DATABASE_URL="<prod>" pnpm --filter @recetario/db exec prisma migrate deploy
pnpm --filter @recetario/db seed:plans
pnpm exec turbo build --filter=@recetario/api
pnpm --filter @recetario/api exec wrangler deploy --env staging    # o production
```

`wrangler.jsonc` de `apps/web` es la **fuente de verdad** del worker: Nitro corre con `cloudflare.deployConfig: false`, así que no se genera `.wrangler/deploy/config.json` (ese archivo pisa la config del repo y descarta los `env` y los settings del dashboard).

## Entornos y variables

`apps/web/wrangler.jsonc` define el nivel superior y los bloques `env.staging` / `env.production`; cada uno redeclara `main` (`.output/server/index.mjs`), `assets` (`.output/public`) y su service binding (`recetario-api-staging` / `recetario-api-production`).

| Variable                | Dónde                              | Efecto                                                                                 |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `NODE_ENV`              | vars de cada env                   | `staging` / `production`                                                               |
| `NUXT_PUBLIC_INDEXABLE` | **sólo** en las vars de producción | `true` habilita indexación; sin ella, `noindex` + `robots.txt` bloqueado (fail-closed) |
| `NUXT_PUBLIC_SITE_URL`  | opcional                           | canonical absoluto (default `https://app.kitchcalc.com`)                               |
| `INTERNAL_API_URL`      | `.dev.vars` en local               | fallback HTTP del relay cuando no hay service binding                                  |

Secrets: se gestionan desde `.env.cloudflare` con `scripts/sync-cloudflare-secrets.mjs` (usa `wrangler secret put` sobre `apps/api`), nunca desde el dashboard:

```bash
cd apps/api
node ../../scripts/sync-cloudflare-secrets.mjs --env staging --dry-run   # ver qué haría
node ../../scripts/sync-cloudflare-secrets.mjs --env staging
```

El worker web **no** necesita secrets: la sesión, Stripe y Better Auth viven en el API.

## Migraciones y seeds

```bash
# Local: crear migración tras editar packages/db/prisma/schema.prisma
pnpm --filter @recetario/db exec prisma migrate dev --name <descriptive>

# Producción (lo hace deploy-api; a mano con DATABASE_URL en el entorno)
pnpm --filter @recetario/db exec prisma migrate deploy
pnpm --filter @recetario/db seed:plans
```

`@recetario/db` se consume como TypeScript crudo (`exports` → `src/index.ts`) y su `build` es `tsc --noEmit`: no hay `dist/` que reconstruir tras `prisma generate`.

## Local development

```bash
pnpm dev          # web :4321 + api :8787 (Turbo)
pnpm dev:web      # sólo http://localhost:4321
pnpm dev:api      # sólo http://localhost:8787
pnpm --filter @recetario/web build && pnpm exec wrangler dev   # smoke con el runtime real (workerd)
```

`scripts/sync-cloudflare-dev-vars.mjs` copia `.env` a `apps/web/.dev.vars` y `apps/api/.dev.vars` (con `INTERNAL_API_URL`/`INTERNAL_API_HOST` por defecto). No commitear `.dev.vars`.

## Observability

Ambos workers tienen `observability.enabled: true`. Tail en vivo:

```bash
cd apps/web && pnpm exec wrangler tail --env staging
cd apps/api && pnpm exec wrangler tail --env staging
```

Logs también en el dashboard (Workers → Logs).

## Stripe webhooks

```
https://api.kitchcalc.com/api/stripe/webhook
```

Eventos: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated` (ver `apps/api/src/billing/webhook.ts`). Verifica `Stripe-Signature` contra `STRIPE_WEBHOOK_SECRET`.

## Common operations

```bash
# Versiones y rollback de un worker
cd apps/web && pnpm exec wrangler versions list --env staging
cd apps/web && pnpm exec wrangler rollback --env staging

# Seed manual
pnpm --filter @recetario/db exec tsx prisma/seed.ts
```

**Rollback del frontend:** `wrangler rollback` restaura la versión anterior del worker (historial de Cloudflare) o se redepliega el commit anterior con `wrangler deploy --env …`. No hay migración de DB ligada al corte del frontend.

## Notas y trampas

- **El bundle web no puede contener Prisma/pg/WASM** y el bundle cliente no puede incluir `better-auth`: el job `dry-run` de CI lo verifica con un `grep` sobre `.output`. El build web no necesita `DATABASE_URL`.
- **Límite de 3 MB gzipped (plan free)**: el dry-run del worker ronda los ~1.2 MB; si crece, revisar el `wrangler:dry-run` antes de desplegar. El plan Paid (10 MB) es el escape si hace falta.
- **`vars` del worker vs. dashboard**: con `deployConfig: false`, lo que manda es `wrangler.jsonc`; no definir estas variables desde el dashboard (se pierden en el siguiente deploy).
- **Host allowlist**: el API valida `Origin`/`Referer` contra `WEB_ORIGIN`; un worker web con host distinto al configurado será rechazado (CSRF/OAuth). Al desplegar staging, verificar que `WEB_ORIGIN` del API de staging apunta al host del web de staging.
