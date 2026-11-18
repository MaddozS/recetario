# Astro is replaced by Nuxt 4 in `apps/web`, migrated in vertical slices behind a single cutover

`apps/web` is rewritten from Astro SSR to Nuxt 4 + Vue. The work happens in a dedicated git worktree, split into per-slice sessions that each keep the tree buildable, and reaches production in exactly one cutover: Astro and Nuxt never serve production together.

## Context

`apps/web` is an Astro 6 SSR application deployed as a Cloudflare Worker (`wrangler deploy` with Workers Assets and a service binding `API` to the `apps/api` Hono Worker — not Cloudflare Pages). It holds 65 `.astro` files: 17 pages split across a public surface (landing, pricing, privacy, terms) and a private, highly interactive surface (recipes, ingredients, production, settings/billing, auth).

The private surface accumulated imperative DOM machinery — MutationObservers, custom elements, `window.__*` globals, template cloning, delegated document listeners, `innerHTML` rendering and a hand-rolled soft-navigation controller — to work around Astro's static rendering model. That machinery, not the markup, is the dominant maintenance cost and the reason this rework exists.

`docs/research/frontend-framework-comparison.md` evaluated Nuxt 4, Next.js 16, SvelteKit 2 and React Router 8 Framework Mode against this codebase.

## Decision

### Framework

`apps/web` becomes Nuxt 4 + Vue, transforming the existing app in place rather than building a parallel one. The selection is a deliberate override of the research's recommendation (see _Deviation_ below), justified by Vue's fit for rewriting imperative DOM code as declarative state and by the legibility goal driving the rework.

Architecture inside `apps/web`:

- **Hybrid layout** — Atomic Design for genuinely shared visual UI (`app/components/ui/{atoms,molecules,organisms}`), feature grouping for business code (`app/features/{auth,billing,ingredients,recipes,production,settings}`). Shared UI is extracted only when reused; a single consumer stays co-located with its feature.
- **Local-first state** — `ref`, `computed` and feature composables by default. Global state only for session, theme/preferences and demonstrated cross-cutting cases. **No Pinia initially.**
- **No porting of the workaround layer** — MutationObserver, custom elements, `window.__*`, `astro:*` events, UI `innerHTML` and the soft-navigation controller are rewritten as Vue state, not carried over.
- **No Prisma, no `@recetario/db`, no `DATABASE_URL`, no migrations in web.** The web app stays a thin SSR client of `apps/api`.

### Hono stays authoritative

`apps/api` keeps validation (Zod), authorization, CSRF, plan/feature limits, business rules and response shaping. Nitro in Nuxt does SSR, routing, SEO metadata, security headers and a transparent same-origin relay to Hono over the `API` service binding. Nitro does not duplicate business logic, and no decision is persisted in Nitro.

Mutations run against Hono; Nuxt only anticipates the error (`pending`, contextual error, visible success, refresh of the affected resource without a full reload).

### Delivery

- **Dedicated worktree.** Migration lives in a Command Code–managed worktree (`worktree-nuxt-rework`) rooted at the agreed baseline commit, so the original Astro checkout is never disturbed and no half-migrated state can reach the original branch.
- **Per-slice sessions.** One task = one session with its own approved plan and durable task file (`docs/tasks/`). Tasks are sequenced by an explicit dependency table; parallel-safe tasks may run concurrently in separate sessions and worktrees, never merged into one session.
- **Temporary coexistence in-repo.** The Astro tree is kept as reference while Nuxt is built with separate scripts; once the Nuxt shell, routes and checks are green, the main `apps/web` scripts move to Nuxt and the remaining `.astro` files leave the build and lint scope while awaiting their slice. A shell of each is never served together.
- **Single cutover.** Only when parity is reached does one final task remove Astro (config, dependencies, plugins, outputs, ignores, `soft-navigation-controller.ts`, obsolete custom elements) and switch Turbo, Wrangler and the deploy workflows to the Nuxt output. Any pending UX improvement is recorded, not bundled into the migration.

### Scope boundaries

- **SEO:** `/`, `/pricing`, `/privacy` and `/terms` are indexable with a unique canonical; auth, private app routes, callbacks/tokens and 404 are `noindex,nofollow`. `/pricing` becomes public, while checkout keeps requiring authentication in Hono.
- **Parity:** appearance, functions, permissions, routes and states are preserved. Only architecturally necessary changes ship with the migration.
- **Quality bar:** unit tests, critical-path E2E on a real build/preview, and visual QA at 375 px and 1280 px for every slice that touches UI.

## Considered Options

The full evaluation, with primary sources, is in `docs/research/frontend-framework-comparison.md`. Summary of the four candidates:

- **React Router 8 (Framework Mode)** — _the research's recommendation._ Best combined risk profile: loaders/actions/`<Form>`/fetchers map cleanly onto a Hono backend behind a service binding, Cloudflare maintains a first-party integration, and React maximizes ecosystem and hiring optionality.
- **SvelteKit 2** — the cleanest technical fit for rewriting imperative DOM code, with an official Cloudflare adapter exposing `platform.env`; ranked second on ecosystem/hiring depth and on API churn (remote functions).
- **Nuxt 4** — technically sound and productive, with a strong head/SEO system, `useAsyncData`/`useFetch`, server-side access to Cloudflare bindings through Nitro, and a documented Better Auth integration. Ranked third because adopting Vue from scratch was judged to add no decisive advantage _on technical merits alone_.
- **Next.js 16** — the most complete metadata ecosystem and the strongest hiring pool, rejected because its full model presumes broad platform capabilities and would need an adapter (OpenNext) over Cloudflare Workers plus an extra caching/image/middleware translation layer, against a backend that stays Hono.

**Deviation.** This ADR knowingly rejects the research's recommendation. The research ranked frameworks on aggregate technical and organizational risk; it did not weight _legibility of the resulting code_ as the primary objective. The rework's stated goal is readability of a data-heavy, frequently-mutating UI — Nuxt/Vue was chosen on that basis, with React's larger ecosystem explicitly not treated as a sufficient reason to adopt a model the team prefers less. SEO was handled as a cross-cutting requirement rather than a selection criterion.

## Consequences

- The Astro implementation survives in-repo as reference only until the cutover; it is never a second production runtime.
- `AGENTS.md`, `README`, `DEPLOY` and current QA/docs are updated during the cutover; historical Astro documentation is identified as such rather than silently rewritten.
- The web bundle must stay free of server-only code (Prisma, `pg`, WASM) and of `@recetario/db`.
- The `apps/api` Hono worker carries CSRF, creation limits and the `recipe_duplicate` feature gate as _authoritative_ checks. The UI only anticipates them — a UI-only gate would be bypassable by calling the API directly.
- Private routes default to `Cache-Control: private, no-store` with no shared CDN cache; entitlements stay uncached.
- Rollback is a redeploy of the last Astro commit/artifact. There is no destructive database migration tied to the frontend cutover.
- Introducing Pinia or a separate UI package remains an explicit non-goal until a real need is demonstrated.
