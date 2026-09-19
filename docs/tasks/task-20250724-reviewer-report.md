# Reviewer Report: lazyInit extract + migrate (Issues #37, #38)

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

## Review Scope
- Spec: Issues #37 and #38 (as quoted in task)
- Plan: none (task-based dispatch)
- Builder report: not provided
- Files reviewed: 13 files (see diff summary)

## Parallel Context
- Parallel group: none
- Review mode: single-task standalone
- Sibling reviewer tasks: none
- Parallel-safe confirmed: n/a — single review

## Skills Used
Selected:
- `ponytail-review` — baseline review lens

Discarded:
- `design-system-verify` — no UI changes
- `security-best-practices` — no auth/permission boundary changes
- Prisma skills — no Prisma schema, migration, or query changes

## Logic Review Gate

This is a pure infrastructure refactor extracting a `lazyInit<T>` factory and replacing 4 identical Proxy patterns. It does not change or depend on:
- UI behavior, route behavior, form/server action behavior
- Prisma data access patterns, owner scoping, auth/session behavior
- Stripe/billing behavior, package contracts, API/data contracts
- Calculations, derived values, validation rules, lifecycle/status transitions
- User-facing copy

**No Logic/Data Flow Trace artifact or validator report required** — the acceptance criteria in Issues #37 and #38 are the source of truth and are mechanically checkable from the code diff.

## Findings

### (a) Missing/partial spec requirements

None. All 15+ acceptance criteria across #37 and #38 are met.

### (b) Scope creep (code not asked for)

| Severity | File | Issue | Evidence | Required Action |
|----------|------|-------|----------|-----------------|
| note | packages/config/tsconfig.json | Extra tsconfig.json added — spec only asks for tsconfig.build.json | New file, not in spec #37 acceptance criteria | Keep (useful for IDE) or remove |
| note | packages/config/src/lazy.ts:3 | `T extends object` constraint not in spec | Spec #36 says `lazyInit<T>(key: string, initFn: () => T): T`; implementation adds `extends object` | Keep (Proxy requires objects; defensive typing) |
| note | packages/config/tsconfig.build.json:18 | `ignoreDeprecations: "6.0"` not in spec | Not requested | Keep (TS 6 required it) |

### (c) Implementation concerns

| Severity | File | Issue | Evidence | Required Action |
|----------|------|-------|----------|-----------------|
| note | packages/config/src/lazy.ts:11 | Failed initFn retries automatically on next property access because Map entry is only set on success | `singletons.has(key)` is false after a throw, so next `get` calls `initFn()` again. Spec says "No retry logic" — this implicit retry is natural lazy-init behavior, not explicit retry logic. | Accept as-is |
| note | packages/config/src/lazy.ts:8,10-11 | Non-atomic init: two concurrent property accesses could both call initFn if the Map.set hasn't completed yet | `if (!singletons.has(key))` → `singletons.set(key, initFn())` is not atomic. Harmless for single-threaded Node.js (JS event loop is non-preemptive), but could double-init in Worker threads. | Accept (single-threaded env) |

## Acceptance Criteria Review

Issue #37:
- [x] `lazy.ts` exports `lazyInit<T>(key, initFn): T` (with `extends object` constraint)
- [x] Singleton cached on `globalThis.__lazySingletons` Map keyed by `key`
- [x] Init function called exactly once per key
- [x] Proxy delegates: function → `.bind(client)`, non-function → direct
- [x] Init exceptions propagate unmodified
- [x] `tsconfig.build.json` exists + `"build": "tsc"` script
- [x] `"./lazy"` export → `dist/src/lazy.js` + `dist/src/lazy.d.ts`
- [x] `@recetario/config` in dependencies (not devDependencies) of auth, billing, db, api
- [ ] `pnpm build in packages/config succeeds` — **unverified** (no bash access)

Issue #38:
- [x] `packages/db/src/prisma.ts` uses `lazyInit("prisma", initPrisma)` — pure factory, no guard
- [x] `packages/auth/src/auth.ts` uses `lazyInit("auth", initAuth)` — pure factory, no `_auth` assignment
- [x] `packages/billing/src/stripe.ts` uses `lazyInit("stripe", initStripe)` — pure factory, no guard
- [x] `apps/api/src/lib/prisma.ts` uses `lazyInit("api:prisma", initPrisma)` — distinct key
- [ ] `pnpm astro check passes` — **unverified** (no bash access)
- [ ] `pnpm dev loads pages without errors` — **unverified** (no bash access)
- [ ] `HMR reload does not cause duplicate Prisma pool connections` — **unverified** (no bash access)
- [ ] `wrangler dev starts the Worker API without errors` — **unverified** (no bash access)
- [ ] `Stripe billing endpoints work through the lazy proxy` — **unverified** (no bash access)
- [x] `all cast in initAuth's return type` — preserved as pre-existing `any` return type

## Protocol Issues

- Builder report not provided
- No reviewer task file found in `docs/tasks/`

## Verdict

**accept** — all statically checkable requirements from Issues #37 and #38 are met. The 5 runtime/load-time acceptance criteria can only be verified by the validator. Minor scope creep items (extra tsconfig.json, `extends object` constraint) are reasonable defensive additions. No blocking issues found.
