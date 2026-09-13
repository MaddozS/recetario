# Task 5 — SEO y páginas públicas

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 5)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-05-public-seo.md`

- **Scope:** `extends-existing`
- **Pre-existing:** landing, `/pricing`, legales, assets y componentes del árbol Astro (referencia, fuera de build); Nuxt 4.5.2 con relay `/api/**`, bootstrap de sesión, `useAuth`/`useTheme`/`useApi`, shell privado y 13 componentes UI (Tasks 2–4); `GET /api/billing/plans` público y `POST /api/stripe/checkout` con auth+CSRF en Hono (Task 3).
- **Dependencies:** Task 4 (completada). HEAD base de la Task: `314603f`, árbol limpio.
- **Parallel-safe:** sí con Task 6. Esta sesión implementó **solo** Task 5.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, rama `worktree-nuxt-rework`.

## Resultado

`apps/web` tiene ya el slice público completo: metadata SEO única y tipada con canonical absoluto, `robots.txt`/`sitemap.xml` explícitos en Nitro, landing + legales + 404 portados a Vue sin maquinaria imperativa, y `/pricing` público con checkout autenticado. La indexación es fail-closed por entorno y el acento de las públicas es coral.

| Elemento | Valor |
|---|---|
| Tests web | **135** (unit 59, nuxt 76) — antes 117 |
| E2E web | **33** (relay 10, shell 10, public 11, smoke 2) — antes 22 |
| Checks raíz | lint 6/6 · type-check 7/7 · test 10/10 (web 135, api 201, auth 31, stripe 66, db 39) · build 7/7 |
| Bundle Nitro | dry-run 771.69 KiB (193.72 KiB gzip); rutas nuevas `robots.txt.mjs` y `sitemap.xml.mjs` |
| Bundle cliente | sin Prisma, `@recetario/db`, Stripe SDK, `better-auth` ni `node:crypto` (solo la ruta `/api/stripe/checkout` y el campo Zod `stripePriceId`) |
| Lighthouse | **16/16 auditorías SEO 100 · a11y 96** (4 rutas × mobile/desktop × claro/oscuro) |

## Decisiones aprobadas en la sesión

1. **Render SSR en las cuatro públicas** (sin prerender). Se descarta la fila "prerender" de la tabla SEO del roadmap: prerenderizar sirve las legales desde el binding ASSETS sin pasar por el worker (sin CSP ni cabeceras del middleware) y pierde la siembra del tema desde `kitchcalc-theme` en SSR.
2. **Gate de indexación explícito y fail-closed:** `NUXT_PUBLIC_INDEXABLE` (default `false`). Sin la variable, las cuatro públicas emiten `noindex,nofollow` y `robots.txt` responde `Disallow: /`. El e2e y el smoke local la activan; la Task 13 debe activarla en producción y dejarla sin definir en staging.
3. **Tema unificado:** la landing consume `useTheme()` (default `system`), sin `landing_theme` ni `localStorage`. Desviación visual documentada: un SO en oscuro ve la landing oscura (Astro forzaba claro).

## Pasos ejecutados

1. **SEO centralizado.** `shared/utils/seo.ts` (builders puros: `PUBLIC_PAGES`, `canonicalUrl`, `buildRobotsTxt`, `buildSitemapXml`, `robotsMetaContent`, `pageSeoFor`) + `app/composables/usePageSeo.ts` (title/description/OG/Twitter/canonical/robots tipados desde `runtimeConfig.public`).
2. **Rutas Nitro.** `server/routes/robots.txt.ts` y `server/routes/sitemap.xml.ts` con `cache-control: public, max-age=3600`; no disparan bootstrap de sesión (extensión ≠ `.json`).
3. **Config.** `runtimeConfig.public.{siteUrl,indexable}`, título global y `robots` por defecto `noindex,nofollow` (cualquier ruta que no declare SEO queda fuera de índices), y `prefix: "landing"` para los componentes del landing.
4. **Acento coral.** `app.vue` (dueño único de `<html>`) resuelve `coral` en las rutas públicas de marketing y la preferencia del usuario en el resto.
5. **Landing.** Componentes Vue en `app/components/landing/` (`Navbar`, `HeroSection`, `FeaturesSection`, `HowItWorksSection`, `PricingSection`, `CTASection`, `Footer`, `ImageLightbox`, `ThemeToggle`, `CountUp`) + `app/layouts/public.vue` con el CSS del `LandingLayout`. Reveals con la directiva `v-reveal` (`app/plugins/reveal.ts`, observer compartido + `getSSRProps`), drawer y scroll-spy como estado Vue, imágenes light/dark desde `useTheme().isDark` (sin `MutationObserver`) y lightbox con `<dialog>` + estado.
6. **Billing compartido.** `app/features/billing/`: `usePricingPlans` (`useAsyncData` + `plansListResponseSchema`, degrada a `[]` como Astro), `useCheckout` (POST con CSRF vía `useApi`, pending/error), `BillingIntervalToggle`, `PlanPrice` y `PlanFeatureList`.
7. **`/pricing` público.** Anónimo → catálogo + CTA a `/sign-in?redirect=…`; autenticado → plan actual deshabilitado, checkout con pending y error inline, banners `?success=1`/`?canceled=1`.
8. **Legales y 404.** `privacy.vue`/`terms.vue` con el copy verbatim del original y `usePageSeo`; `error.vue` con título/description propios y `noindex`.
9. **Tests.** Unit de los builders SEO, nuxt de las piezas de planes, e2e de metadata SSR/robots/sitemap/404/interacciones/checkout + stub del API ampliado.
10. **Verificación completa, Lighthouse (16 auditorías) y QA visual 375/1280 claro/oscuro.**

## Hallazgos (bugs reales encontrados)

| # | Hallazgo | Estado |
|---|---|---|
| 1 | **Componentes del landing no resueltos.** `pathPrefix: true` en un dir de componentes no prefija los archivos de su raíz (`prefixParts` usa la ruta *relativa*), así que `<LandingNavbar>` no existía y la landing SSR devolvía solo el shell. Además `scroll-spy.ts` dentro de `app/components/` se registraba como componente fantasma (`Component <Anonymous> is missing template or render function`). | **Arreglado**: `prefix: "landing"` en `nuxt.config.ts` y el helper movido a `app/composables/useLandingScrollSpy.ts`. Detectado al inspeccionar el HTML SSR (29 KB vs 4 KB). |
| 2 | **Drawer visible con `prefers-reduced-motion`.** El bloque de reduced-motion heredado de Astro forzaba `transform: translateX(0)` y `opacity: 1` en el panel cerrado, dejándolo encima de la página. Se vio en las capturas de QA con motion reducido. | **Arreglado**: el bloque solo retira la transición; el estado lo gobierna `data-open`. Regresión cubierta por el e2e `prefers-reduced-motion el drawer cerrado no tapa la página`. |

## Desviaciones respecto del plan

| # | Desviación | Motivo |
|---|---|---|
| 1 | Sin prerender en `/privacy` y `/terms` | Decisión aprobada (cabeceras del worker + tema desde cookie en SSR) |
| 2 | `useSeoMeta` con `robots` en `error.vue` | `useHead` plano no permitía el set completo; verificado en e2e (404 real con título y noindex) |
| 3 | Toggle de periodo unificado (`px-5 min-h-11`) en vez de reproducir el `px-4 py-2` de `/pricing` | Una sola pieza para landing y página; mejora el área táctil. Diferencia visual mínima |
| 4 | `PlanPrice` usa `text-2xl md:text-3xl` en ambas vistas | Evita un prop de tamaño solo por 4px |
| 5 | CTA anónimo de `/pricing` con estilo accionable (no el gris de "deshabilitado" de Astro) | La página ahora es pública: el CTA del plan Free debe poder clickearse; el gris se reserva al autenticado |
| 6 | `scroll-spy.ts` sale de `app/components/` | Nuxt escanea `.ts` como componentes (hallazgo 1) |
| 7 | Icono `zoom-in` añadido al registro | Único faltante del port |
| 8 | Tests e2e con `page.emulateMedia({ reducedMotion: "reduce" })` | Cubre el hallazgo 2 |
| 9 | `stub-api.mjs` rechaza el checkout sin `x-csrf-token` | El e2e falla si el cliente no envía el token (contrato de Hono) |

## Verificación

| # | Comando | Resultado |
|---|---|---|
| 1 | `pnpm --filter @recetario/web lint` | 0 errores, 0 warnings |
| 2 | `pnpm --filter @recetario/web type-check` | `nuxt typecheck` sin errores |
| 3 | `pnpm --filter @recetario/web test` | 12 archivos, **135 tests verdes** (unit 59, nuxt 76) |
| 4 | `pnpm --filter @recetario/web test:e2e` | **33/33** (public 11, relay 10, shell 10, smoke 2) |
| 5 | `pnpm --filter @recetario/web build` | `.output/server/index.mjs` + `.output/public`; rutas `robots.txt`/`sitemap.xml` en el server |
| 6 | `pnpm --filter @recetario/web wrangler:dry-run` | 771.69 KiB (193.72 KiB gzip); bindings `API`, `ASSETS`, `NODE_ENV` |
| 7 | `pnpm lint && pnpm type-check && pnpm test && pnpm build` (raíz) | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7 |
| 8 | `grep` del bundle cliente | sin Prisma/DB/Stripe SDK/`better-auth`/`node:crypto` |
| 9 | Lighthouse (build real con `wrangler dev`) | **16/16: SEO 100 · a11y 96** |
| 10 | QA visual (agent-browser, build real) | 375/1280 × claro/oscuro; ver tabla siguiente |
| 11 | `git status` | solo archivos de esta Task (+ los `.commandcode/taste/*` que el sistema de taste mantiene modificados desde antes de la sesión) |

### Evidencia SEO/SSR (e2e `public.spec.ts`)

- Las 4 rutas: `<html lang="es">`, `<title>` único, `description`, `robots: index, follow`, canonical absoluto idéntico a `og:url`, `og:image` absoluta y **un solo** `<h1>` y canonical por página.
- `/sign-in`: `noindex, nofollow` y sin canonical (fail-closed incluso sin declarar).
- `robots.txt`: allow de las 4 exactas + `Disallow: /` + sitemap; `sitemap.xml`: exactamente 4 `<loc>` (todas 200) y ninguna ruta privada.
- 404 real (`/ruta-que-no-existe`): status 404, título propio, `noindex`, sin canonical.
- Interacciones: drawer (abre/Escape), tema (toggle → `html.dark` → sobrevive recarga por cookie), periodo (MXN $9.99 → $7.99), lightbox (abre/Escape), cero errores de consola.

### Lighthouse (SEO 100 · a11y 96 en las 16 combinaciones)

| Página | Mobile claro | Mobile oscuro | Desktop claro | Desktop oscuro |
|---|---|---|---|---|
| `/` | 100 / 96 | 100 / 96 | 100 / 96 | 100 / 96 |
| `/pricing` | 100 / 96 | 100 / 96 | 100 / 96 | 100 / 96 |
| `/privacy` | 100 / 96 | 100 / 96 | 100 / 96 | 100 / 96 |
| `/terms` | 100 / 96 | 100 / 96 | 100 / 96 | 100 / 96 |

Único hallazgo de a11y: `color-contrast` (4 nodos en `/` y `/pricing`, 1 en las legales) en el botón primario coral (`bg-accent-600 text-white` → 2.95:1) y la etiqueta `text-accent-600/80` del hero. **Es preexistente**: las clases son idénticas a `apps/web/src/components/atoms/Button.astro:51` y `HeroSection.astro:89`. Umbral ≥90 cumplido; se registra como deuda, sin tocar tokens globales ni la paridad visual.

## Paridad responsive / QA visual

Build real de Cloudflare (`wrangler dev` :4322) contra el API real en :8787, con `agent-browser` (0.27.0) y capturas en `apps/web/test-results/qa/` (gitignored; Playwright borra `test-results/` en cada corrida, así que son regenerables con el mismo guion). Para las capturas se emuló `reduced-motion` (todo visible, sin animaciones) y el tema se fijó con la cookie `kitchcalc-theme`.

| Condición | Mobile (375) | Desktop (1280) | Evidencia |
|---|---|---|---|
| navbar | hamburguesa + logo + CTA "Comenzar gratis"; links solo en el drawer | links visibles (Funciones/Cómo funciona/Precios) + toggle + CTA | capturas + eval (`h1`, secciones) |
| drawer | abre con el botón (panel x=0), cierra con Escape; cerrado queda fuera de pantalla | no aplica | `375-home-drawer-dark.png` + e2e de geometría |
| hero | columna centrada, CTAs apilados, tarjeta de costos ($2.40/$1.20/$3.60), logo oculto | texto a la izquierda + logo 288px a la derecha | capturas 375/1280 |
| features | columnas apiladas, captura full width, hint de ampliar visible | texto/imagen alternados | capturas |
| how-it-works | pasos apilados con chips de stats | pasos centrados | capturas |
| pricing (landing) | carrusel horizontal con snap (Free visible) + fade | 3 columnas, Pro destacado | capturas + eval (`plans: 3`) |
| pricing (/pricing) | tarjetas apiladas, toggle centrado, CTA full width | 3 columnas | capturas |
| periodo | MXN $79.00/$249.00 (mensual) ↔ $63.20/$199.20 (anual) | idéntico | eval + captura anual |
| anónimo vs autenticado | CTA `→ /sign-in?redirect=/pricing` (Free → `/recipes`) | idéntico | eval + e2e del checkout |
| legales / 404 | artículo `max-w-3xl` + navbar/footer; 404 con h1 propio | idéntico | capturas |
| tema claro/oscuro | `data-theme`, clase `dark`, acento coral (`#e84d5a` claro / `#ff5f6d` oscuro) desde el primer paint | idéntico | eval + capturas |
| reveals | 13 bloques; 1–2 visibles al cargar, el resto al scrollear; con reduced-motion visibles sin animación | idéntico | eval (`13/1`) |

Móvil no omite información: navbar completa en el drawer, precios y features del plan en ambas vistas, breadcrumb/banner equivalentes y el mismo CTA por sesión.

**Nota de QA:** el agente no renderiza imágenes de forma fiable al inspeccionar varias a la vez; la verificación visual se hizo con geometría/estilos computados (`eval`) + 12 capturas revisadas una a una (`375-home-*`, `375-pricing-*`, `375-privacy-light`, `375-404-light`, `375-home-drawer-dark`, `375-home-lightbox-dark`, `1280-home-*`, `1280-pricing-*`). El lightbox se abrió por click sintético porque el click de `agent-browser` no abría el modal; el contrato real lo cubre el e2e.

## Riesgos y rollback

| Riesgo | Estado |
|---|---|
| Componentes del landing sin resolver | Ocurrió (hallazgo 1); arreglado y cubierto por e2e SSR |
| Drawer visible con reduced motion | Ocurrió (hallazgo 2); arreglado con test de regresión |
| Prerender sin cabeceras del worker | Evitado por decisión 1 (SSR) |
| Indexar staging por olvido | Fail-closed: sin `NUXT_PUBLIC_INDEXABLE=true` todo queda bloqueado |
| Lighthouse por debajo del umbral | 100/96 en las 16 combinaciones |
| Planes del API caídos | Degrada a `[]` con aviso visible; `/pricing` no rompe (paridad con la landing Astro) |
| Checkout contra Stripe real en QA | No se clickeó: el flujo autenticado se cubre con el stub (`403` sin CSRF) |
| Cookie `landing_theme` legada | Ignorada; sin cleanup de código (follow-up) |

**Rollback:** `git revert` de los commits de la Task. No hay migraciones ni deploy; el árbol Astro sigue intacto. El único estado persistente nuevo es la escritura de `kitchcalc-theme` desde el toggle público (cookie existente, sobrescribible).

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit | Contenido |
|---|---|
| `feat(web): agregar la infraestructura SEO y las rutas robots/sitemap` | `shared/utils/seo.ts`, `usePageSeo`, `runtimeConfig`, rutas Nitro, acento coral en `app.vue` |
| `feat(web): portar la landing pública a Vue` | componentes del landing, `layouts/public.vue`, directiva `v-reveal`, feature de billing, `index.vue`, `zoom-in` |
| `feat(web): hacer pública la página de planes con checkout` | `pricing.vue`, `useCheckout` |
| `feat(web): portar legales y metadata del 404` | `privacy.vue`, `terms.vue`, `error.vue` |
| `test(web): cubrir SEO, robots/sitemap y las páginas públicas` | unit/nuxt/e2e + stub + `playwright.config` |
| `docs(nuxt): registrar la task 05` | este task file, `AGENTS.md` |

## Follow-ups para las próximas sesiones

1. **Task 6 (auth):** consumir `usePageSeo` para `noindex,nofollow`; las CTAs públicas ya usan `?redirect=`.
2. **Task 11:** reutilizar `usePricingPlans`/`PlanPrice`/`PlanFeatureList`/`useCheckout`; quedan para su dueño el banner `?success=1`, `?plan=<tier>` y el `PUT /api/preferences` para persistir tema/acento (hoy el toggle público solo escribe la cookie).
3. **Task 13:** `NUXT_PUBLIC_INDEXABLE=true` en producción y sin definir en staging; `NUXT_PUBLIC_SITE_URL` por entorno; `assets.run_worker_first`/CSP si algún día se prerenderiza.
4. **Deuda a11y (preexistente):** contraste del botón coral (`bg-accent-600 text-white` = 2.95:1) y de `text-accent-600/80`; requiere decisión sobre el token coral, fuera del alcance del slice.
5. **Cookie legada `landing_theme`:** ignorada por la app; se puede borrar sin código.
6. `graphify` no se usó (preferencia vigente lo prohíbe); `graphify update .` queda pendiente para cuando la preferencia cambie.
