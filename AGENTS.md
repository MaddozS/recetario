# AGENTS.md — Recetario

> **Migración Nuxt en curso.** `apps/web` se está reescribiendo de Astro a Nuxt 4 + Vue en el worktree `worktree-nuxt-rework`, hoy en `/Users/maddozs/personal-projects/recetario-nuxt-rework` (fuera de `~/.commandcode/` para no disparar prompts de permiso). El árbol Astro (`apps/web/src/**`) queda como referencia fuera de build/lint/type-check hasta la Task 13. Decisión en `docs/adr/0009-nuxt-frontend-rework.md`; estado por task en `docs/tasks/` (última: `task-20260915-1139-recipe-detail.md`).
>
> **Task 4 (relay, sesión y shell) ya está en la rama.** Detalles operativos:
>
> - `pnpm dev` en `apps/web` sincroniza `.dev.vars` y limpia `.vite-cache/web`, y sirve en `localhost:4321` (el API confía en `WEB_ORIGIN`). El API sigue en `localhost:8787`: en dev el relay cae a HTTP contra `INTERNAL_API_URL`.
> - `apps/web/server/**` es Nitro: relay `/api/**`, bootstrap de sesión y cabeceras privadas. El estado de sesión lo resuelve `useAuth().resolveSession()` (contexto del request → `GET /api/auth/session`).
> - Preferir `useApi()` y `@recetario/stripe/subscription` en el código nuevo; el barrel de `@recetario/stripe` arrastra el SDK.
> - **Íconos:** `Icon.vue` compone el `<svg>` desde los datos de lucide (`app/utils/icon-registry.ts` → `__iconData`), **no** desde sus componentes: son funcionales y usan `inject()`, que perdía la instancia de Vue en el primer render SSR dentro del `Suspense` de un layout (500 en la primera petición de cada proceso). No reintroducir componentes de `@lucide/vue` en el render; el contrato de markup está en `test/nuxt/icon-parity.spec.ts`.
>
> **Task 5 (SEO y páginas públicas) ya está en la rama.** Detalles operativos:
>
> - Las cuatro rutas indexables son `/`, `/pricing`, `/privacy` y `/terms` (`shared/utils/seo.ts`): layout `public.vue`, metadata vía `usePageSeo()` y `robots.txt`/`sitemap.xml` como rutas de Nitro.
> - **Indexación fail-closed:** sin `NUXT_PUBLIC_INDEXABLE=true` las públicas emiten `noindex,nofollow` y `robots.txt` bloquea el sitio completo. Producción la activa al desplegar (Task 13); staging la deja sin definir. `NUXT_PUBLIC_SITE_URL` fija el canonical absoluto (default `https://app.kitchcalc.com`).
> - `/pricing` es pública: el anónimo ve el catálogo y su CTA pasa por `/sign-in?redirect=…`; el checkout sigue exigiendo sesión y CSRF en Hono.
> - El landing no porta la maquinaria de Astro: `useTheme()` unificado (sin `landing_theme` ni localStorage), `v-reveal` (directiva con un observer compartido y cleanup) y estado Vue para drawer, lightbox, scroll-spy y precios. El acento de las públicas es coral (`app.vue`).
> - Tests de referencia: `test/unit/seo.spec.ts`, `test/nuxt/public-ui.spec.ts` y `test/e2e/public.spec.ts` (metadata SSR, robots/sitemap, 404, checkout con el stub del API).
>
> **Task 6 (flujos de autenticación) ya está en la rama.** Detalles operativos:
>
> - Las cinco rutas (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`) usan `layouts/auth.vue`, `useNoindexSeo()` (title + `noindex,nofollow`, **sin** canonical ni OG) y viven en `shared/utils/seo.ts` → `AUTH_PAGES`/`isAuthPath()`. Junto con las públicas indexables son las rutas de acento coral (`isCoralAccentPath()` en `app.vue`).
> - `server/middleware/10.auth.ts` aplica `cache-control: private, no-store` + `x-robots-tag: noindex, nofollow` a las rutas de auth (llevan token en la query). `PUBLIC_PAGES` sigue con 4 rutas: ni `robots.txt` ni `sitemap.xml` cambian.
> - **Transporte propio, sin `better-auth` en el bundle**: `app/features/auth/useAuthApi.ts` sobre `useRequestFetch()` + Zod (`auth-contracts.ts`) + `toAuthApiError()` (entiende el envelope de Hono, los errores de Better Auth `{message, code}` y las rutas custom `{error, code, errors}`). No importar `@recetario/auth/client` ni el barrel `@recetario/auth` en la web: arrastran `createAuthClient`; para las reglas de contraseña existe el subpath `@recetario/auth/password`.
> - Los formularios son componentes montables (`app/features/auth/*Form.vue`) con props desde la query; las páginas sólo leen la query, declaran layout/`guest` y SEO. Tras un sign-in correcto se navega con **carga completa** (`navigateTo(..., { external: true })`) para que el SSR vuelva a resolver la sesión.
> - `useCountdown` (reset) limpia el intervalo al desmontar; `PasswordRules` alimenta las 5 reglas desde `getRuleResults`.
> - Tests de referencia: `test/unit/auth-{redirect,messages,error}.spec.ts`, `test/nuxt/auth-ui.spec.ts` y `test/e2e/auth.spec.ts` (el stub del API cubre credenciales inválidas, email sin verificar, reset válido/expirado y verify).
> - **QA funcional en dev:** el relay lee `INTERNAL_API_URL` de `.dev.vars` (proxy de wrangler) antes que `process.env`; para apuntar el dev server al stub de los e2e hay que levantarlo en `8787` (`STUB_API_PORT=8787 node test/e2e/support/stub-api.mjs`).

> **Task 7 (slice de ingredientes) ya está en la rama.** Detalles operativos:
>
> - `app/features/ingredients/**` es el patrón del slice vertical: piezas puras sin aliases (`ingredient-form`, `ingredient-search`, `ingredient-messages`, `ingredient-state`, `ingredient-units`), `useIngredients()` y los componentes de la feature. Las mutaciones van directo a Hono y la lista/contadores se actualizan en sitio con los reducers puros (`withCreated`/`withUpdated`/`withRemoved`): **sin recarga y sin query params de feedback**.
> - `UNIT_OPTIONS`/`parseIngredientNumber`/`formatUnitCost` viven en la feature (no en `shared/`) porque el proyecto `unit` de Vitest no resuelve el alias `#shared`; se promueven a `shared/utils/` cuando recetas o producción los necesiten. Los tipos del API se derivan del schema (`IngredientRecord = z.infer<typeof ingredientSchema>`) para no duplicar el contrato.
> - **Límite de plan:** se anticipa con `canCreateIngredient` sobre los contadores SSR y el `PLAN_LIMIT` de Hono se mapea al mismo mensaje; el CTA “Actualizar plan” aparece **sólo** en ese caso (`planLimit: true`), nunca en errores genéricos.
> - `Dialog` del kit acepta `size` (`md|lg|xl`) y `scroll` (defaults = comportamiento anterior); los dialogs de feature reciben la mutación como **function prop** para resetear/cerrar sólo en éxito.
> - Tests de referencia: `test/unit/ingredient-*.spec.ts`, `test/nuxt/ingredients-ui.spec.ts` y `test/e2e/ingredients.spec.ts`; el stub expone `POST /api/__qa/ingredients/reset` y `GET /api/__qa/ingredients/state` para que cada test sea determinista.
> - **Nota de tests:** con `mountSuspended`, `wrapper.emitted()` y `findComponent(Component).emitted()` están vacíos (el wrapper es el del `Suspense`). Para assertar eventos usa listeners espía en `attrs` (`"onUpdate:open"`, `onEdit`, …).

> **Task 8 (listado de recetas) ya está en la rama.** Detalles operativos:
>
> - `app/features/recipes/**` sigue el patrón del slice: piezas puras sin aliases (`recipe-form`, `recipe-filters`, `recipe-messages`, `recipe-stats`, `recipe-state`), `useRecipes()` y los componentes de la feature. Crear/duplicar/eliminar mutan con `withCreated`/`withRemoved` y **después** navegan o dejan feedback: la mutación previa deja la lista correcta sin esperar al viaje de vuelta (el refetch al remontar lo aclaró la Task 9: `purgeCachedData` es `true`).
> - **El filtro por categoría vive en la URL** (`?category=`; `""` = sin categoría, ausente = todas) y se resuelve con `navigateTo`: el back/forward y el deep link salen gratis y una navegación solo-query no remonta la página ni pierde la búsqueda.
> - **Contratos retirados:** `?type=`, `?message=` y `?upgrade=1` (los generaba el redirect de Astro). El límite de plan ahora sólo muestra la alerta inline con «Actualizar plan», igual que la Task 7.
> - **`@recetario/stripe/formatters`** (subpath nuevo) expone `timeAgo`/`formatCurrency` sin arrastrar el SDK; usar ese subpath en lugar del barrel.
> - **Los componentes de una feature no están auto-registrados** (el escaneo es solo de `~/components/ui` y `~/components/landing`): hay que importar siempre los de `app/features/**`. Si falta el import, el componente se renderiza como nada y `nuxt typecheck` no lo detecta (lo cazan los tests nuxt).
> - Tests de referencia: `test/unit/recipe-*.spec.ts`, `test/nuxt/recipes-ui.spec.ts` y `test/e2e/recipes.spec.ts`; el stub expone `/api/__qa/recipes/reset|state` y `qa-plan=free|basic|pro` con los límites y features reales de `plans-config.ts`.
> - **Hallazgos abiertos con dueño:** el task file de la Task 8 cierra con «Hallazgos abiertos y quién los atiende», una tabla que mapea cada pendiente a la Task que lo cierra (9, 11, 12 o 13) y distingue los que se resuelven _de paso_ de los que exigen trabajo explícito. Leerla antes de planear la Task 9 (detalle) o la 12 (producción).

> **Task 9 (detalle y edición base de receta) ya está en la rama.** Detalles operativos:
>
> - `/recipes/[id]` es el slice real: header (título/categoría, badge, «Actualizado», Mezclas), tabs con hash (`#ingredientes|#costos-fijos|#presentaciones`), lista de ingredientes en cards móvil / tabla desktop con «Ver notas», editor con picker y `FinancialSummary` base. `useRecipeDetail()` es el composable; la página sólo compone.
> - **`PATCH /api/recipes/:id` ahora responde shapeado** (`shapeRecipeDetail`, igual que el GET): antes devolvía la fila cruda de Prisma y no validaba contra `recipeWithIngredientsSchema`. El detalle usa la respuesta validada como estado nuevo.
> - **El composable es `async` y espera su `useAsyncData`**: sin esperar, el servidor renderiza el formulario vacío y el cliente lo hidrata lleno («Hydration completed but contains mismatches», que en producción no dice nada — se diagnostica en dev). Los hooks de ciclo de vida (`onMounted`) van **antes** del primer `await`.
> - **`refreshNuxtData` desde otra página es un no-op**: `useAsyncData` desregistra su hook al desmontar y `experimental.purgeCachedData` es `true`, así que el listado se remonta y refetchea solo al volver. No hay que refrescarlo a mano (corrige el handoff de la Task 8).
> - **Contratos de URL:** `?edit=true` (entrar empuja, cancelar/salir usan `replace`), `?multiplier=` (reactivo, sin recargas) y los hashes de tab. Retirados `?type=`/`?message=`/`_fc`.
> - **`shared/` es la fuente de las piezas compartidas**: `UNIT_OPTIONS`/`DEFAULT_UNIT` (`#shared/utils/units`) y `normalizeSearchText` (`#shared/utils/search`); el proyecto `unit` de Vitest resuelve `#shared` desde esta Task.
> - Costos Fijos y Presentaciones muestran «Pendiente: Task 10»; `FinancialSummary` ya calcula con los `recipeFixedCosts` reales. El menú de acciones tiene variante `page` con Escape + gestión de foco.
> - Tests de referencia: `test/unit/recipe-detail-*.spec.ts`, `test/unit/recipe-financials.spec.ts`, `test/nuxt/recipe-detail-ui.spec.ts` y `test/e2e/recipe-detail.spec.ts`; el stub cubre `GET`/`PATCH /api/recipes/:id`, `patchAttempts` y la sentinela `Fallo simulado`.
> - **Notas de tests:** las vistas ocultas cuentan igual y `getByText` resuelve al nodo más profundo: acotar por contenedor (`table`, `[data-multiplier='desktop|mobile']`). El stub es **un único proceso** para toda la suite: un error en un handler tumba todos los specs con fallos en cascada. `request.get` de Playwright sigue redirects salvo `maxRedirects: 0`.
> - **Formato:** `pnpm format` de la raíz no funciona (prettier sólo existe en `apps/web`); usar `pnpm --filter @recetario/web exec prettier --write <paths>`.

> **Task 10 (presentaciones, costos fijos y finanzas) ya está en la rama.** Detalles operativos:
>
> - `app/features/recipes/{recipe-fixed-costs,recipe-presentations}.ts` son las piezas puras (draft, validación, payloads, reducers y las métricas por pieza); `recipe-financials.ts` expone además `computeRecipeFixedCostsTotal`, `computeRecipeBatchCost` y `computeSuggestedBatchPrice`. `useRecipeFinancials` es el composable de las subsecciones.
> - **Un solo escritor del detalle:** `useRecipeDetail` expone `applyRecipe(next)`. Las mutaciones de costos fijos y presentaciones aplican la respuesta del API ahí, y el resumen financiero, el costo de mezcla y los importes por pieza se recalculan solos (`computed`). No hay recargas ni parche de DOM (el baseline recargaba al crear un costo fijo).
> - **CRUD autónomo del modo de edición de receta** (mandato del roadmap): «Nueva Presentación» y «Agregar Costo Fijo» están siempre visibles, aunque el baseline escondía el primero detrás de `?edit=true`.
> - **`salePrice` es opcional con semántica propia:** el input muestra el guardado o el sugerido; guardar sin tocarlo **omite** la clave (`priceDirty`) y vaciarlo envía `null`. El `PATCH` de presentación responde **sin** `fixedCosts`: `mergePresentationResponse` los conserva.
> - **Tokens:** `turmeric`/`herb`/`chili` del baseline no existen en el design system; los badges usan `warning`/`success`/`danger`/`accent`. Los FCs por presentación siguen sin UI (paridad), aunque el cálculo los soporte.
> - Tests de referencia: `test/unit/recipe-{fixed-costs,presentations,financials,messages}.spec.ts`, `test/nuxt/recipe-financials-ui.spec.ts` y `test/e2e/recipe-financials.spec.ts`; el stub expone los CRUD reales, `fixedCostAttempts`/`presentationAttempts` y `lastPresentationPatch`.
> - **Notas de tests:** un `button[type=submit]` **no** dispara el submit con `trigger("click")` en el entorno de test (`form.trigger("submit")`); los dialogs de confirmación están siempre montados, así que hay que acotar los selectores (`data-fc-cancel`, `data-presentation-*`); los valores de un `<input>` no son `textContent` (usar `toHaveValue`). Para QA con `agent-browser`: `cookies set --url http://localhost:4321` y el tema real se cambia con la cookie `kitchcalc-theme`, no tocando la clase `dark`.

> **Task 11 (settings, preferencias y billing) ya está en la rama.** Detalles operativos:
>
> - `/settings` es el slice real: tabs con `?tab=` (router, back/forward y deep links), perfil (nombre y contraseña), preferencias y facturación en `app/features/settings/**` + `app/features/billing/**`. `/settings/billing` **es un 301 de Nitro** (`server/routes/settings/billing.ts`, preserva la query) y no una página; `/pricing?plan=basic|pro` resalta la card objetivo (anillo doble + scroll).
> - **Cuenta con contrato JSON + envelope:** `packages/types/src/api/account.ts` + `apps/api/src/account/handlers.ts`. `update-name` devuelve `{firstName,lastName}`, `change-password` y `change-email` devuelven `{ok:true}`; la política de contraseña es la de sign-up (`validatePassword`: 8+, mayúscula, minúscula, número, especial) y los errores de Better Auth se traducen en el handler. `sync-session` responde `{ok:true}` o lanza `ApiError` (404/409/500).
> - **Apariencia:** `useAppearancePersistence().saveAppearance()` es el único camino de guardado — previsualiza, hace `PUT /api/preferences` y escribe las cookies **desde la respuesta confirmada** (revierte la snapshot en error). El toggle del landing lo usa cuando hay sesión; el anónimo escribe sólo cookie. `useAuth` expone `applyPreferences`/`applyProfile` para las respuestas confirmadas.
> - **Validación antes de llamar:** los formularios no validan; lo hace `useAccountSettings` con `account-form.ts` (0 requests si es inválido). Las reglas de contraseña se muestran con `PasswordRules` de `features/auth`.
> - **Billing:** `useSettingsOverview` (página) sincroniza `?session_id=`, carga contadores y trae la suscripción fresca (`scheduledChange` sólo existe ahí); `BillingSection` compone `usePricingPlans`/`useCheckout`/`useBillingPortal` y los dialogs de plan/confirmación reutilizan `PlanPrice`/`PlanFeatureList`/`BillingIntervalToggle`. El stub controla los escenarios con `qa-plan`, `qa-subscription` (trial|canceled|scheduled), `qa-usage=low`, `qa-prefs=error`, `qa-portal=error`, `qa-sync=error` y `__qa/settings/reset|state`.
> - **Notas de tests:** los dialogs viven siempre montados: acotar los assertos con `data-plan-summary`, `data-usage-cards`, `data-plan-features` (evita strict-mode de Playwright); el stub exige CSRF sólo si hay `Origin` (las llamadas del SSR pasan, como Hono); `es-MX` no rellena con cero los días (`1/10/2026`). Diseño: el bloque del cambio programado lleva `<!-- prettier-ignore -->` porque prettier rompe el `</strong>` y ESLint lo prohíbe.
> - **Íconos:** `lucide:palette`, `save`, `monitor`, `sun`, `moon` ya están en el registro; no hace falta añadir ninguno.

## Stack

**Astro 6** SSR via `@astrojs/cloudflare` (Cloudflare Pages). Two apps: `apps/web` (Astro Pages) + `apps/api` (Hono Worker). **pnpm 11.1.2** (package-manager locked). **Node >= 22.23.1**.
No `.env.local` — use `.env`.

## Commands

**For manual terminal/tool invocations, always use `pnpm exec` or `pnpm dlx`** to respect pinned pnpm/Node version. Do not introduce other package runners in new instructions, docs, or one-off commands.

| Command                                 | Purpose                        |
| --------------------------------------- | ------------------------------ |
| `pnpm dev`                              | Dev server at `localhost:4321` |
| `pnpm build`                            | Production build               |
| `pnpm preview`                          | Preview build locally          |
| `pnpm format`                           | Prettier whole project         |
| `pnpm astro check`                      | Type-check `.astro` + `.ts`    |
| `pnpm eslint .`                         | Lint JS/TS/Astro               |
| `pnpm exec prisma migrate dev --name X` | Create migration               |
| `pnpm exec prisma generate`             | Regenerate client              |
| `pnpm exec prisma studio`               | Open Prisma Studio             |
| `pnpm exec tsx prisma/seed.ts`          | Run seed manually              |

**Schema changes**: When modifying `prisma/schema.prisma`, always create a new migration with `pnpm exec prisma migrate dev --name <descriptive>`. Never edit existing migration files.
**postinstall** generates the Prisma client automatically; if you need to run the same step manually, use `pnpm exec prisma generate`.
**cloudflare-build** (apps/web) runs Prisma generate, migrate deploy, and Astro build; reproduce with `pnpm --filter @recetario/web cloudflare-build`. **api deploy** via `pnpm --filter @recetario/api deploy` (wrangler deploy). Set per-environment secrets via `wrangler pages secret put <KEY>` (web) / `wrangler secret put <KEY>` (api) or the Cloudflare dashboard.

App test infrastructure: `apps/api` and `packages/db` use Vitest (`pnpm --filter @recetario/api test`, `pnpm --filter @recetario/db test`). If tests are requested for a package without infra, propose `Vitest` and confirm with the user before scaffolding.

## Architecture

### Auth

Better Auth via `src/lib/auth.ts` (server singleton) + `src/lib/auth-client.ts` (client). Google OAuth. Middleware (`src/middleware.ts`) populates `Astro.locals.{user, session, subscription}` on every request. `SubscriptionPlan` rows auto-seeded on first authenticated request (`globals.__plansSeeded` guard).

### Pages & routing

- **Protected** (`Astro.locals.session` required): `/recipes`, `/recipes/[recipe]`, `/ingredients`, `/settings`, `/produccion` (`/settings/billing` redirects 301 to `/settings?tab=billing`)
- On protected pages, if `Astro.locals.session` is null, return `Astro.redirect("/sign-in")` at the top of the frontmatter.
- **Public**: `/sign-in`, `/sign-up`, `/pricing`
- `/produccion` also gated behind `production_planner` feature flag
- If the `production_planner` flag is false, redirect to `/settings?tab=billing` with an upgrade prompt.
- Layout: `Layout` (app shell + sidebar) or `LandingLayout` (marketing). `currentPage` prop: `recipes | ingredients | settings | production`.

### Data layer

**PostgreSQL + Prisma ORM** is the data layer for `apps/api` (Hono worker) and the seed script. The web app (`apps/web`) does NOT import Prisma or `@recetario/db` directly — every web page calls `apps/api` via `apiFetch` (see "Web→API destination rule" below). The singleton PrismaClient (with the Accelerate extension) lives in `packages/db/src/prisma.ts`.

- Output: `generated/prisma/` (non-standard — set in `schema.prisma:7`)
- Apps import via the `@recetario/db` workspace package; the web app must not import it.
- Multi-tenant: every record has `ownerId`. Scoped by `RECIPES_STATIC_OWNER_ID`/`EMAIL` env vars for seed users.
- CRITICAL: `packages/db` is **pure persistence** — CRUD methods only, returning raw Prisma rows or status objects. No validation, no normalization, no response shaping. Every tenant-scoped CRUD method takes `ownerId` and scopes its queries by it (or via `recipe: { ownerId }` for nested joins) — this is enforced **inside the db methods**, so `apps/api` never has to remember it. New tenant records must set `ownerId` on create. Seed/bootstrap flows are the only exception. The `@recetario/db` package has unit tests (`src/owner-scoping.test.ts`) asserting each method's `where` includes `ownerId`.
- **`apps/api` never imports `prisma`** — all data access goes through `@recetario/db` CRUD methods. The only packages that import `prisma` are `packages/auth` (Better Auth's `prismaAdapter` requires the raw client) and the seed script.
- Validation (Zod `.safeParse()` via `@recetario/types`) and response shaping live in `apps/api` handlers.
- `packages/stripe` owns Stripe domain logic (thin Stripe API helpers, pricing, feature gating, and subscription shaping) and calls `@recetario/db` CRUD methods. `packages/db` owns pure persistence; the only db→stripe import is `prisma/seed-plans.ts`.
- Seed data: `data/ingredients.json`, `data/recipes.json`. Loaded on first run via `seedIfNeeded()`.

#### Web→API destination rule

`apps/web` is a thin SSR client of `apps/api`. It must not import `prisma` or `@recetario/db` directly. The only allowed data access from web is:

- `apiFetch(path, { schema, ... }, Astro.request)` from `@/lib/api-client` for live data
- Types from `@recetario/types` (Zod schemas and TS types — type-only is fine)
- Pure transformation in `apps/web/src/lib/*` (e.g. `production-calculator.ts`)

If a new feature needs data access from a web page, add the endpoint in `apps/api` and call it via `apiFetch`. This keeps the data layer in one place.

### Key gotchas

#### Data invariants

- **MUST NOT VIOLATE** Recipe updates are destructive: the `$transaction` deletes all `RecipeIngredient` rows, then re-creates them.
- **MUST NOT VIOLATE** Ingredient deletes are blocked when the ingredient is referenced by any recipe (returns `{ status: "blocked", recipes: [...] }`).
- **MUST NOT VIOLATE** `RecipeIngredient` uses an autoincrement `id` PK with `@@index([recipeId, ingredientId])` (not a composite PK), so the same ingredient can appear multiple times in a recipe.
- **Feature flags**: 12 keys live in `FREE_FEATURES` (all false). Basic enables 5; Pro enables all 12.

#### Operational gotchas

- **Forms**: no Astro Actions. POST to the same page, read `Astro.request.formData()`, then redirect. Spanish locale: `parseNumberInput()` converts comma to dot.
- **Subscription cache**: `getSubscriptionByUserId` (the hot path behind `/api/auth/session` and every authenticated page) is deliberately **uncached** — entitlements must never be stale. Only `getUserPreferences` and `getCredentialAccount` still use Accelerate edge caching (`cacheStrategy` with `ttl: 60`, `swr: 120`, tagged `user:<id>`); writes invalidate via `invalidateAccelerateCache` in `@recetario/db` (best-effort; failures are logged).
- **pnpm allowed builds**: only `esbuild`, `sharp`, `@prisma/engines`, `prisma` are allowed in `pnpm-workspace.yaml`.
- **Cloudflare ephemeral**: `DATABASE_URL` is not auto-injected — set per-environment via `wrangler secret put` or the dashboard. Local dev: `pnpm dev` runs `scripts/sync-cloudflare-dev-vars.mjs` which copies root `.env` to `apps/web/.dev.vars` and `apps/api/.dev.vars`.
- **Feedback + reload**: `showFeedback()` is client-side DOM; `window.location.reload()` after it erases feedback, so prefer DOM updates for in-page state.

#### Autoridad de mutaciones (Hono)

- **CSRF**: `csrfProtection()` en `apps/api/src/middleware/csrf.ts` cubre todo `POST|PUT|PATCH|DELETE`. Exige `Origin`/`Referer` confiable y, si la petición viene de navegador con cookies, doble-submit (`x-csrf-token` o `_csrf` contra la cookie `csrf_token`). Exentos: `POST /api/stripe/webhook` y `/api/auth/**` (Better Auth valida su propio origen). Las peticiones sin `Origin` (service binding, SSR) pasan por diseño.
- **Límites de plan**: `requireRecipeCapacity`, `requireIngredientCapacity` y `requireFeature` en `apps/api/src/entitlements.ts`; sin fila de suscripción se aplica el plan free (fail-closed). Al agotarse lanzan `PLAN_LIMIT` / `FEATURE_REQUIRED` (403): la UI sólo muestra CTA de upgrade con `PLAN_LIMIT`.
- **Auditoría de sign-in**: `recordSignInAudit` corre en `databaseHooks.session.create.after` de Better Auth (`packages/auth/src/auth.ts`); el middleware web no inspecciona paths.
- **Preferencias**: la respuesta validada de `GET/PUT /api/preferences` (y `session.preferences`) es la fuente; las cookies de tema/acento son sólo una réplica visual.

#### Known bugs

- **Tsconfig exclude**: this is a known bug. Do NOT modify it unless explicitly asked. If asked, split it into separate array entries: `["dist", ".agent/**", ".astro/**", "node_modules/**"]`.

### Modules you might miss

- `src/lib/instructions-parser.ts` — markdown→HTML rendering for recipe instructions (parses headings, steps, `@ingredient` refs)
- `src/lib/html-sanitizer.ts` — DOMPurify wrapper for recipe instructions (limited tag/attr allowlist)
- `src/lib/formatters.ts` — exports `formatCurrency` and `timeAgo` (no `formatNumber`)
- `src/lib/form-utils.ts` — `parseNumberInput(value)` for Spanish-format decimals
- `src/lib/auth-client.ts` — client-side Better Auth (used for sign-in popup)
- `src/lib/sign-in.ts` / `src/lib/sign-out.ts` — Google sign-in with popup/open-in-tab
- `src/lib/dialog.ts` — `bindDialogBackdrop()` utility

### Stripe billing

3 routes in `src/pages/api/stripe/`:

- `checkout` (POST, auth) — creates Checkout Session, returns `{ url }`
- `portal` (POST, auth) — creates Customer Portal session
- `webhook` (POST, no session auth — verified via Stripe signature header using `STRIPE_WEBHOOK_SECRET`) — handles `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

API version: `2026-04-22.dahlia`.

## Client-side patterns

- **Binding guards**: `data-*-bound="1"` attributes prevent duplicate listener binding across SPA navigations
- **Lifecycle**: Bind on both `astro:page-load` and `astro:after-swap`
- **Theme**: `applyTheme()` reads `html.dataset.theme` / `html.dataset.accent`. No `.dark` CSS overrides — semantic tokens auto-adapt.
- **Accent colors**: 7 families (`indigo`, `violet`, `blue`, `emerald`, `rose`, `amber`, `coral`) in `src/lib/accent-colors.ts`. Landing layout always uses `coral`.

## UI conventions

- **ALWAYS** use `Button`, `Input`, `Dialog`, `Badge`, `Card`, `FeedbackAlert`, `SectionHeading`, `FinancialSummary` from `@/components/ui` barrel. Icons: import named components from `@recetario/ui/icons/<Name>.astro` or use `DynamicIcon` from `@recetario/ui/DynamicIcon.astro` for dynamic resolution.
- **ALWAYS** use semantic tokens (`bg-card`, `text-foreground`, `border-border`, `accent-*`). Never hardcoded colors.
- **Dialog backdrops**: use `backdrop:bg-backdrop/50`, never `backdrop:bg-slate-900/50`.

### Icon components

Per-icon `.astro` components live in `packages/ui/src/icons/<Name>.astro`. Import directly:

```astro
import Check from "@recetario/ui/icons/Check.astro";
<Check size={18} class="text-success" />
```

Missing an icon? Drop a new `.astro` file into `packages/ui/src/icons/` and import it. TypeScript catches typos at the import line — no allowlist, no central registry.

For dynamic icon names (resolved at runtime), use `DynamicIcon`:

```astro
import DynamicIcon from "@recetario/ui/DynamicIcon.astro";
<DynamicIcon name="lucide:check" size={16} />
```

`DynamicIcon` strips the `lucide:` prefix automatically.

### Responsive state enumeration

When a UI component behaves differently across breakpoints or page states, analysis reports and task files **must enumerate each discrete state** explicitly. Never describe responsive behavior as a single case.

**Required format** (use in analysis reports and task files):

| Condition | Mobile (< md)  | Desktop (≥ md) |
| --------- | -------------- | -------------- |
| [state 1] | [what renders] | [what renders] |
| [state 2] | [what renders] | [what renders] |

**Mobile/desktop parity rule**: Mobile and desktop must provide equivalent semantic information. Mobile may rearrange or compact, but must never omit information that desktop shows. Reviewers must verify parity by mentally rendering each state at each breakpoint.

### Visual QA for UI changes

Any task that modifies visible UI components requires visual verification before declaring completion:

- **Implementer**: After code changes, run `pnpm dev` and visually inspect the result at both desktop (1280px) and mobile (375px) viewports. Note any visual issues in the report.
- **Reviewer**: Include a "Visual QA" checklist section that verifies:
  - Desktop rendering looks intentional and complete
  - Mobile rendering matches expectations
  - Mobile and desktop provide equivalent information (parity check)
  - No broken icons, missing elements, or layout issues

This goes beyond `pnpm astro check` — that only verifies types, not visual correctness.

## Process Conventions

### Task File Convention

Plans reference task files — they don't embed them. Each subagent task gets its own file at `docs/tasks/task-YYYYMMDD-HHmm-<agent>.md`. The plan's Tasks section lists summaries; the task file has full technical steps.

### Task Dependency Convention

Plans MUST include a `## Task Dependencies` table before the `## Tasks` section:

```markdown
## Task Dependencies

| Task   | Depends On | Parallel-Safe |
| ------ | ---------- | ------------- |
| Task 1 | —          | yes           |
| Task 2 | Task 1     | no            |
```

Each task in the plan MUST specify:

- **Scope**: `new` | `extends-existing` | `fix` — what type of work
- **Pre-existing**: list components/files already implemented that this task builds on
- **Dependencies**: which tasks must complete first

This prevents task scope ambiguity where a builder discovers work already done.

### Pre-Flight Checks

Before dispatching builder tasks, the orchestrator should verify tool dependencies:

```bash
# Graphify dependencies
$(cat graphify-out/.graphify_python 2>/dev/null || echo python3) -c "import networkx" 2>/dev/null && echo "graphify: ok" || echo "graphify: networkx MISSING"
```

If dependencies are missing, document the gap in the task file's guardrails so the builder knows to use the fallback procedure (grep/glob instead of graphify).

### ESLint Cleanup

Unused imports and variables should be cleaned before validation, not after. Options:

1. **Pre-commit hook** (recommended): Add `pnpm eslint . --fix` to a pre-commit hook via `husky` + `lint-staged` to auto-remove unused imports on commit.
2. **CI check**: Add `pnpm eslint .` as a required CI check that blocks merge on lint errors.
3. **Builder self-check**: Builders already run `pnpm eslint .` as part of their verification checklist. Unused imports should be fixed in the same task, not deferred to a separate fix-ESLint task.

The goal is to eliminate the need for a dedicated fix-ESLint task after validation.

### Parallel Execution Notes

When a plan dispatches 2+ tasks in parallel, include a "Parallel Execution Notes" section listing any files touched by multiple tasks. State whether the overlap is expected conflict-free (different sections of the same file) or needs coordination.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
