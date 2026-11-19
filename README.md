# KitchCalc (Recetario)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node: >=22.23.1](https://img.shields.io/badge/node->=22.23.1-brightgreen.svg)](package.json)
[![pnpm: 11.1.2](https://img.shields.io/badge/pnpm-11.1.2-orange.svg)](package.json)

Costeo de recetas, inventario de ingredientes y planificador de producción para negocios gastronómicos.

Monorepo **pnpm** con dos apps sobre **Cloudflare Workers**:

| App        | Stack                                            | Rol                                                                     |
| ---------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `apps/web` | Nuxt 4 + Vue 3 sobre Nitro (`cloudflare_module`) | SSR, routing, SEO, UI y relay same-origin `/api/**`                     |
| `apps/api` | Hono + Better Auth + Prisma (PostgreSQL)         | Autoridad: validación, autorización, CSRF, límites de plan y mutaciones |

El web es un cliente delgado del API: no importa Prisma ni `@recetario/db`. El detalle de la arquitectura y las convenciones vive en [`AGENTS.md`](./AGENTS.md); el despliegue, en [`DEPLOY.md`](./DEPLOY.md).

---

## Requisitos

- Node **>= 22.23.1**
- pnpm **11.1.2** (`corepack enable` o `packageManager` del `package.json`)
- PostgreSQL (local o servicio gestionado como Neon)

---

## Configuración y Desarrollo

1. **Instalar dependencias:**

   ```sh
   pnpm install
   ```

2. **Variables de entorno:**
   Copia el archivo de ejemplo a `.env` en la raíz (sin `.env.local`):

   ```sh
   cp .env.example .env
   ```

   Configura tu cadena de conexión `DATABASE_URL` y secretos básicos. Al correr `pnpm dev`, este archivo se sincroniza automáticamente con `apps/web/.dev.vars` y `apps/api/.dev.vars`.

3. **Base de datos y datos semilla:**

   ```sh
   pnpm exec prisma migrate dev
   pnpm exec tsx packages/db/prisma/seed.ts
   ```

4. **Iniciar servidores de desarrollo:**
   ```sh
   pnpm dev          # web en http://localhost:4321 + API en http://localhost:8787 (Turbo)
   ```

En desarrollo, el relay `/api/**` del web cae a HTTP contra `INTERNAL_API_URL` (`http://localhost:8787`): el service binding `API` solo existe en el Worker desplegado.

---

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

---

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

---

## Datos por usuario

Ingredientes y recetas se consultan y guardan por usuario autenticado. Para que una cuenta local vea el dataset semilla, define una de estas variables de entorno con esa cuenta:

- `RECIPES_STATIC_OWNER_EMAIL`
- `RECIPES_STATIC_OWNER_ID`

---

## Documentación y Contribución

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — guía de contribución, ramas y estándares de código.
- [`AGENTS.md`](./AGENTS.md) — arquitectura, convenciones y gotchas.
- [`DEPLOY.md`](./DEPLOY.md) — Cloudflare Workers, migraciones, secrets y rollback.
- [`CONTEXT.md`](./CONTEXT.md) — glosario del dominio culinario y de costeo.
- [`DESIGN.md`](./DESIGN.md) — tokens semánticos, diseño y accesibilidad.
- [`docs/README.md`](./docs/README.md) — mapa de documentación.

---

## Licencia y Marca

Este proyecto es software libre distribuido bajo la licencia **MIT**. Consulta el archivo [`LICENSE`](./LICENSE) para más detalles.

> **Aviso de Marca:** El nombre **KitchCalc**, su logotipo, imagen de marca y nombres de dominio asociados son propiedad exclusiva del autor y no forman parte de los derechos otorgados por la licencia de software.
