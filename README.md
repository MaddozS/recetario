# KitchCalc (Recetario)

Costeo de recetas, inventario de ingredientes y planificador de producción para negocios gastronómicos.

Monorepo **pnpm** con dos apps sobre **Cloudflare Workers**:

| App        | Stack                                            | Rol                                                                     |
| ---------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `apps/web` | Nuxt 4 + Vue 3 sobre Nitro (`cloudflare_module`) | SSR, routing, SEO, UI y relay same-origin `/api/**`                     |
| `apps/api` | Hono + Better Auth + Prisma (PostgreSQL)         | Autoridad: validación, autorización, CSRF, límites de plan y mutaciones |

El web es un cliente delgado del API: no importa Prisma ni `@recetario/db`. El detalle de la arquitectura y las convenciones vive en [`AGENTS.md`](./AGENTS.md); el despliegue, en [`DEPLOY.md`](./DEPLOY.md).

## Requisitos

- Node **>= 22.23.1**
- pnpm **11.1.2** (`corepack enable` o `packageManager` del `package.json`)
- Un archivo `.env` en la raíz (sin `.env.local`). `pnpm dev` copia su contenido a `apps/web/.dev.vars` y `apps/api/.dev.vars`.

## Desarrollo

```sh
pnpm install
pnpm dev          # web en http://localhost:4321 + API en http://localhost:8787 (Turbo)
```

En dev el relay `/api/**` del web cae a HTTP contra `INTERNAL_API_URL` (`http://localhost:8787`): el service binding `API` sólo existe en el Worker desplegado. La base de datos es Prisma Postgres; `pnpm exec prisma migrate dev` aplica el esquema y `pnpm exec tsx prisma/seed.ts` carga el dataset semilla.

## Comandos

| Comando                                         | Acción                                          |
| ----------------------------------------------- | ----------------------------------------------- |
| `pnpm dev`                                      | Web `localhost:4321` + API `localhost:8787`     |
| `pnpm build`                                    | Build de producción (Turbo)                     |
| `pnpm lint` / `pnpm test`                       | Lint / tests de todos los workspaces            |
| `pnpm --filter @recetario/web type-check`       | `nuxt typecheck`                                |
| `pnpm --filter @recetario/web test:e2e`         | Playwright (chromium + smoke de firefox/webkit) |
| `pnpm --filter @recetario/web wrangler:dry-run` | Dry-run del Worker con el `wrangler.jsonc` real |
| `pnpm format`                                   | Prettier de todo el proyecto                    |

## Estructura

```text
apps/
├─ api/                 # Hono Worker (auth, CSRF, límites, Stripe, Prisma)
└─ web/                 # Nuxt 4
   ├─ app/              # pages, layouts, components/ui, features, composables, utils
   ├─ server/           # Nitro: relay /api/**, bootstrap de sesión, rutas SEO
   ├─ shared/           # utilidades puras compartidas (#shared/*)
   ├─ test/             # Vitest (unit, nuxt) + Playwright (e2e, stub del API)
   └─ wrangler.jsonc    # artefacto Nitro (.output/**) por entorno
packages/
├─ auth/  ├─ config/  ├─ db/  ├─ stripe/  └─ types/
```

## Datos por usuario

Ingredientes y recetas se consultan y guardan por usuario autenticado. Para que una cuenta local siga viendo el dataset semilla, define una de estas variables de entorno con esa cuenta:

- `RECIPES_STATIC_OWNER_EMAIL`
- `RECIPES_STATIC_OWNER_ID`

Ese usuario lee y edita el dataset semilla; el resto empieza con datos aislados.

## Documentación

- [`AGENTS.md`](./AGENTS.md) — arquitectura, convenciones y gotchas (fuente de verdad para agentes).
- [`DEPLOY.md`](./DEPLOY.md) — Cloudflare, migraciones, secrets y rollback.
- [`CONTEXT.md`](./CONTEXT.md) — glosario de dominio.
- [`docs/README.md`](./docs/README.md) — qué documentación está viva y qué es histórica.
