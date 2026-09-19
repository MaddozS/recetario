# wrangler dev + Better Auth + Prisma 7 WASM query compiler

> **Histórico (pre-Nuxt).** Documento de la etapa anterior a la migración a Nuxt (Task 13b): se conserva como registro, no como guía operativa, y las rutas o comandos que cita pueden no existir. Ver `docs/README.md`.

**Date:** 2026-07-27
**Question:** What "WASM limitation" was the workaround at `apps/web/src/pages/api/auth/[...path].ts` actually working around, and can we delete that file now and let `auth.handler` / `auth.api.*` run in the `apps/api` Hono worker under `wrangler dev`?
**Status:** open — workaround is not required by Better Auth on this stack; the real risk is the **Prisma 7.8 WASM query-compiler leak** in long-lived isolates, which affects both apps equally but is mitigated by the repo's per-isolate `lazyInit` singleton pattern. Recommend bump `better-auth` → 1.6.25, validate with `wrangler dev`, then delete the workaround file.

## TL;DR

- The "WASM" in the workaround comment is the **Prisma 7 query-compiler WASM blob** that `wrangler` bundles for the API worker (`packages/db/generated/prisma/internal/query_compiler_fast_bg.wasm`, 3.5 MB), not anything in Better Auth itself.
- Better Auth 1.6.11 has no WASM dependency. Its crypto uses `@noble/hashes` (pure-JS scrypt) by default and `node:crypto.scrypt` under the `node` condition, both of which work in `workerd` with `nodejs_compat` ([packages/auth/src/auth.ts:28](packages/auth/src/auth.ts)).
- The real reason `auth.handler` likely misbehaved in `apps/api` under `wrangler dev` is the **Better Auth 1.6.x AsyncLocalStorage lazy-init race** ([better-auth#10300](https://github.com/better-auth/better-auth/issues/10300)), fixed on **Jul 9 2026 in 1.6.24**. The repo is pinned to **1.6.11**, so it is still affected.
- Separately, Prisma 7.8 has an **open** memory-leak in long-lived isolates ([prisma#29660](https://github.com/prisma/prisma/issues/29660)). It bites the per-request `new PrismaClient()` pattern; the repo's per-isolate `lazyInit` singleton ([packages/config/src/lazy.ts](packages/config/src/lazy.ts)) sidesteps it but is itself the kind of pattern the issue warns about.
- The workaround file `apps/web/src/pages/api/auth/[...path].ts` is **not necessary for any current reason**. It routes the same `auth.handler` to Node.js (Astro SSR), which doesn't make the WASM go away — it just hides it under a different runtime, and the same `packages/auth/src/auth.ts:94` `lazyInit` re-runs the singleton there.

## Findings

### 1. The "WASM limitation" — what it actually refers to

There is **no Better Auth WASM**. Better Auth's crypto stack is pure-JS or `node:crypto`:

- `@better-auth/utils` exposes two `./password` entry points ([package.json:73-81](node_modules/.pnpm/@better-auth+utils@0.4.0/node_modules/@better-auth/utils/package.json)):
  - `password.node.mjs` — `node:crypto.scrypt` (only picked when the `node` export condition is honored by the bundler)
  - `password.mjs` — `@noble/hashes/scrypt.js` (default; pure JS, no WASM)
- Better Auth's JWT code uses `getWebcryptoSubtle` and the xchacha20poly1305 cipher from `@noble/ciphers` ([crypto/index.mjs:5-8](node_modules/.pnpm/better-auth@1.6.11_@cloudflare+workers-types@5.20260726.1_@prisma+client@7.8.0_prisma@7_b12966974097a443d248a757d55019d0/node_modules/better-auth/dist/crypto/index.mjs)) — both pure JS.

The single WASM blob in the API worker's bundle is **Prisma 7's query compiler**:

```
$ pnpm --filter @recetario/api exec wrangler deploy --dry-run --outdir=/tmp/wrangler-dryrun
 ⛅️ wrangler 4.114.0
────────────────────
Total Upload: 6729.50 KiB / gzip: 1714.44 KiB
Your Worker has access to the following bindings:
Binding                          Resource
env.NODE_ENV ("production")      Environment Variable

$ ls /tmp/wrangler-dryrun/
23f884361ad3033cf55010f971781b415e95947f-query_compiler_fast_bg.wasm   (3.5 MB)
index.js                                                                  (3.2 MB)
index.js.map
README.md
```

The generated glue ([packages/db/generated/prisma/internal/query_compiler_fast_bg.js:6](packages/db/generated/prisma/internal/query_compiler_fast_bg.js)) does:

```js
class F {
  …
  free(){ const t=this.__destroy_into_raw(); o.__wbg_querycompiler_free(t,0) }
  constructor(t){ const n=o.querycompiler_new(t); if(n[2]) throw w(n[1]); this.__wbg_ptr=n[0]>>>0; I.register(this,this.__wbg_ptr,this); return this }
}
```

This is the leak surface: `querycompiler_new` allocates in module-shared `WebAssembly.Memory` (which only grows), and the matching `free()` is only reached via the `connected → disconnect` state-machine path inside `engine.stop()`.

So the comment "API worker's WASM limitation in wrangler dev" is almost certainly shorthand for the **Prisma 7.8 long-lived-isolate leak** observed in `wrangler dev`, attributed to the wrong root cause.

#### What about `apps/web`?

`apps/web` is an Astro 7 + `@astrojs/cloudflare` project (Vite SSR). The Vite SSR build chokes on Prisma's `.wasm-base64.mjs` files (huge base64 blobs inlined into JS), so `apps/web/astro.config.mjs:20` aliases those to an empty stub:

```js
{ find: /^@prisma\/client\/runtime\/.*\.wasm-base64\.mjs$/,
  replacement: path.resolve(__dirname, "./src/lib/empty-wasm-base64.mjs") },
```

The stub at `apps/web/src/lib/empty-wasm-base64.mjs` documents itself as a `workerd`-irrelevant fallback: the `apps/web` web app does **not** use the WASM query compiler in dev (it uses the browser Prisma stub via the Vite alias). This is **not** the same as the API's WASM problem.

### 2. The real Better Auth bug that almost certainly motivated the workaround

**Repo pin:** `packages/auth/package.json:29` → `better-auth: 1.6.11`.

**[better-auth#10300](https://github.com/better-auth/better-auth/issues/10300) — `request-state AsyncLocalStorage lazy-init has a concurrency race`** (closed Jul 9 2026; reporter reproduced on 1.6.14 *and* 1.6.23; the buggy `ensureAsyncStorage` is byte-identical across 1.6.x).

The reporter's `ensureAsyncStorage` is:

```ts
const ensureAsyncStorage = async () => {
  const g = __getBetterAuthGlobal();
  if (!g.context.requestStateAsyncStorage) {            // (1) check
    const AsyncLocalStorage = await getAsyncLocalStorage(); // (2) await — yields
    g.context.requestStateAsyncStorage =               // (3) assign — overwrites
      new AsyncLocalStorage();
  }
  return g.context.requestStateAsyncStorage;
};
```

In `wrangler dev`, two concurrent `auth.api.getSession()` calls on a fresh isolate race: A assigns, A's handler runs, B resumes past (2), B overwrites, A's later `getCurrentRequestState()` returns the wrong ALS and throws `No request state found …` → 500 → `getSession` returns null → logged-in user seen as logged out. Spurious 401s on cold isolates. The fix is one line:

```ts
g.context.requestStateAsyncStorage ??= new AsyncLocalStorage();
```

Repo at 1.6.11 is **before** the fix; the workaround file is the blunt hammer that avoids the race by routing to a different isolate (the Astro one, which doesn't use the same `lazyInit` pattern across requests for the singleton).

**Bonus open issue:** [better-auth#10315](https://github.com/better-auth/better-auth/issues/10315) — lazily-cached init promises hang forever on Workers when the initial request is aborted. The reporter notes `auth.handler` in `auth.api.getSession` hangs *before any DB access* if the first request in a fresh isolate is aborted. Mitigation per the reporter: eagerly seed the three ALS storages from a static `node:async_hooks` import outside any request, and `ctx.waitUntil` `auth.$context`. **Only reproducible under real client-abort traffic** — unlikely to bite a `wrangler dev` smoke test, but worth knowing.

### 3. Is it fixed (as of 2026-07-27)?

| Bug | First affected | Fixed in | Status on this repo (better-auth@1.6.11) |
|---|---|---|---|
| `ensureAsyncStorage` ALS race (better-auth#10300) | 1.6.14 onward (byte-identical in 1.6.x) | 1.6.24 (closed 2026-07-09) | **affected** |
| ALS dynamic-import hang on client abort (better-auth#10315) | 1.6.20 onward | **open** (PR #10318 unmerged) | affected under abort traffic |
| Eager `createRequire(import.meta.url)` in `_virtual/_rolldown/runtime.mjs` (better-auth#9983) | 1.7.0-beta.4 only | 1.7.0-beta.5+ (closed 2026-06-12) | **not affected** (1.6.11 is pre-beta) |
| Prisma 7.8 per-request `PrismaClient` WASM leak (prisma#29660) | 7.8.0 | **open** (opened 2026-06-25) | n/a — repo uses per-isolate singleton, not per-request |
| `node:crypto scrypt` (via `@better-auth/utils/password.node.mjs`) | n/a | n/a | **works** under workerd with `nodejs_compat` (compat_date ≥ 2024-09-23). Web `wrangler.jsonc` uses 2026-06-10; api uses 2026-07-08. |
| `node:async_hooks` AsyncLocalStorage | n/a | n/a | **works** (🟢 natively supported per Cloudflare docs) |

Latest published `better-auth` on npm: **1.6.25**, 4 days ago (npm registry page). The fix for #10300 is in that range.

### 4. Workarounds evaluated

**A. Keep the existing web-app route as a fallback (current state).**
- Pros: zero risk; known working.
- Cons: two auth surfaces (two different session singletons via `lazyInit`), CSRF cookies issued by the API worker won't be visible to the web app's verifier and vice versa, two `prisma` client instances per isolate, deployment drift. The comment "avoiding the API worker's WASM limitation" is a misdiagnosis — the same Prisma WASM is loaded by the web app's adapter and would have the same lifecycle.

**B. Delete the workaround; route `/api/auth/*` exclusively through the API worker.**
- Requires: bump `better-auth` to ≥ 1.6.24 (gets the ALS race fix), keep `nodejs_compat` on both wrangler configs, ensure `apps/web/astro.config.mjs` proxies or redirects `/api/auth/*` to the API origin.
- Does **not** require: anything to fix the Prisma WASM leak — the per-isolate singleton pattern (already in `packages/db/src/prisma.ts`) sidesteps it.
- Open risk: prisma#29660 may still bite at high traffic on the **web** app's Vite SSR path if anyone refactors to per-request. The `empty-wasm-base64.mjs` alias in `apps/web/astro.config.mjs:20` does **not** apply to the API worker bundle.

**C. Switch the API worker to a non-WASM driver adapter (Neon HTTP, D1 HTTP, etc.).**
- Eliminates the WASM module entirely from the API bundle.
- Requires: changing the Prisma datasource from `postgresql` to whichever provider, migrating secrets, re-deploying. Out of scope for the workaround question.
- Worth a follow-up task file: the API worker's bundle is **6.7 MB** today, mostly WASM. Switching to Neon HTTP (`@prisma/adapter-neon` HTTP variant) is the only adapter that does not pull `query_compiler_fast_bg.wasm`.

**D. Pin to an older Prisma that doesn't use the query-compiler WASM.**
- Prisma ≤ 6.x used the binary engine (`@prisma/engines`), which the repo's `pnpm-workspace.yaml` already allows. That engine runs as a Node child process, which does **not** work in workerd either. Not actually a fix.
- Pre-7 driver adapters had their own path; moving backwards is not realistic.

**E. `@cloudflare/vitest-pool-workers` for dev.**
- This is a test-time pool (Sourcemap- and HMR-aware), not a dev-time replacement. There is no `wrangler dev --use-vitest-pool` mode. It does not help with this question.

### 5. Recommended path forward

1. **Bump `better-auth`** in `packages/auth/package.json:29` from `1.6.11` → `^1.6.25` (latest stable; includes the #10300 ALS fix; npm registry shows 1.6.25 published 4 days ago).
2. **Delete `apps/web/src/pages/api/auth/[...path].ts`** and its comment.
3. **Update the auth client** (`packages/auth/src/auth-client.ts` — read at `packages/auth/src/auth-client.ts`) so the client points at the API origin for `/api/auth/*`. Likely needs `baseURL` set to the API's URL on the server-side `createAuthClient` and the existing client used in the web app to send auth requests cross-origin to the API.
4. **Re-run `pnpm astro check` and `pnpm eslint .`** to catch unused imports in the web app (the `auth` import in the deleted file's siblings).
5. **Validate end-to-end** with `pnpm --filter @recetario/api dev` + `pnpm --filter @recetario/web dev` and hit `/api/auth/get-session` from the web app — watch for:
   - First-request 500s on cold isolates (would indicate the #10315 hang pattern; if seen, see the `ctx.waitUntil` mitigation in the issue).
   - Slow requests (~+480 ms CPU per `/api/auth/*` call): the closed issue #10188 noted a per-request router rebuild; not blocking, but worth knowing.
6. **Long-term**: open a task file to migrate the API worker off the `pg` driver adapter to `@prisma/adapter-neon` (HTTP) to drop the 3.5 MB WASM blob and eliminate prisma#29660 from the blast radius entirely. This is the only durable fix for the WASM question; the Better Auth side is fine.

## Citations

**Local repo evidence**
- `apps/web/src/pages/api/auth/[...path].ts:4-5` — the workaround comment being investigated.
- `apps/web/wrangler.jsonc:4-5` — `compatibility_date: 2026-06-10`, `compatibility_flags: ["nodejs_compat"]`.
- `apps/web/astro.config.mjs:18-23` — Vite alias for `@prisma/client/runtime/*.wasm-base64.mjs` → `empty-wasm-base64.mjs`.
- `apps/web/src/lib/empty-wasm-base64.mjs:1-3` — the stub, self-documented as workerd-irrelevant.
- `apps/api/wrangler.jsonc:5-6` — `compatibility_date: 2026-07-08`, `compatibility_flags: ["nodejs_compat"]`.
- `apps/api/src/index.ts:248-249` — the API worker **already** calls `auth.handler(c.req.raw)` for the catch-all `/api/auth/*`. The code path exists; the workaround file is what the web app falls back to.
- `apps/api/src/index.ts:67-206` — the auth endpoints (`/forgot-password`, `/reset-password`) that the API also handles. API rate limiting is now deferred; same pattern, no workaround.
- `packages/auth/package.json:29` — `better-auth: 1.6.11`.
- `packages/auth/src/auth.ts:1-90` — `betterAuth({…})` config; uses `prismaAdapter(prisma, { provider: "postgresql" })`.
- `packages/db/src/prisma.ts:10-31` — `lazyInit` singleton Prisma client with `pg.Pool(max: 3)`.
- `packages/config/src/lazy.ts:1-17` — per-isolate singleton via `globalThis.__lazySingletons`.
- `packages/db/generated/prisma/internal/query_compiler_fast_bg.wasm` (3.5 MB) + `.js` — the WASM module in question.
- `node_modules/.pnpm/better-auth@1.6.11_…/node_modules/better-auth/dist/crypto/index.mjs:1-68` — pure-JS crypto path.
- `node_modules/.pnpm/better-auth@1.6.11_…/node_modules/better-auth/dist/crypto/password.mjs:1-14` — `node:crypto scrypt` is wrapped via the `node` condition.
- `node_modules/.pnpm/@better-auth+utils@0.4.0/node_modules/@better-auth/utils/package.json:73-81` — `./password` export with `node`, `import`, `require` conditions.

**Primary sources**
- Cloudflare, "Node.js compatibility" — https://developers.cloudflare.com/workers/runtime-apis/nodejs/ (last updated 2026-07-01). `node:crypto` and `node:async_hooks` listed as 🟢 natively supported when `nodejs_compat` is on with `compatibility_date ≥ 2024-09-23`.
- Cloudflare, "Compatibility flags" — https://developers.cloudflare.com/workers/configuration/compatibility-flags/ (last updated 2026-04-23). `nodejs_compat` docs confirm v2 polyfills are bundled.
- Cloudflare, "Bundling" — https://developers.cloudflare.com/workers/wrangler/bundling/ (last updated 2026-04-23). Wrangler ships `?module` WASM imports as `WebAssembly.Module` at runtime; no miniflare-vs-workerd fork in this code path.
- Cloudflare, "Configuration" — https://developers.cloudflare.com/workers/wrangler/configuration/ (last updated 2026-07-24). `local_protocol` is transport-only (http vs https), does not affect the runtime.
- npm registry, "better-auth" — https://www.npmjs.com/package/better-auth — 1.6.25 latest, published 4 days ago (2026-07-23).
- better-auth/better-auth#9983 — "1.7.0-beta.4: eager createRequire(import.meta.url) … crashes Cloudflare Workers" (closed 2026-06-12, fix in 1.7.0-beta.5+). Not in scope for 1.6.11.
- better-auth/better-auth#10300 — "request-state AsyncLocalStorage lazy-init has a concurrency race → intermittent `No request state found`" (closed 2026-07-09, `ensureAsyncStorage` byte-identical across 1.6.x, fix in 1.6.24+).
- better-auth/better-auth#10315 — "Lazily-cached init promises hang forever on Cloudflare Workers when the initializing request is aborted" (still **open** as of 2026-07-27; PR #10318 in flight; workarounds: static `node:async_hooks` import + `ctx.waitUntil`).
- prisma/prisma#29660 — "Per-request PrismaClient leaks WASM query compiler → OOM in long-lived Workers / wrangler dev isolate (driver adapters, v7.8)" (open 2026-06-25, reporter's stack: `prisma`/`@prisma/client`/`@prisma/adapter-pg` 7.8.0, `pg` 8.22.0, workerd 1.20260617.1, compat_date 2026-06-11, `["nodejs_compat"]` — **the same configuration as `apps/api`**). Reproduces with per-request `new PrismaClient({ adapter })`. Per-isolate singleton (which `packages/db/src/prisma.ts:10-31` uses) avoids this specific failure mode.
- prisma/prisma Cloudflare Workers issues page — https://github.com/prisma/prisma/issues?q=is%3Aissue+cloudflare+workers — cross-checked the open / closed list; nothing else matches the "WASM" symptom.
- Prisma docs, "Deploy to Cloudflare Workers & Pages" — https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare-workers — confirms `pg` + `@prisma/adapter-pg` + `nodejs_compat` is the supported pattern, and that the per-request pattern with `ctx.waitUntil(prisma.$disconnect())` is what they document.

**Not relied on (excluded)**
- Astro/Cloudflare adapter issues for `wrangler dev` — searched, no relevant "WASM" symptom found for 14.1.4.
- workerd issues page — searched for `wasm wrangler dev`; only tangentially related results (segfaults on Linux in 2024, libsodium RNG, etc.); no Prisma-specific or 2026 hits.
- Secondary blog posts on Better Auth + Cloudflare — multiple, all of them older than 1.6.x; none cited.

## Open follow-ups

- [ ] Confirm whether bumping `better-auth` to `^1.6.25` actually fixes the symptom the workaround was added for — needs a 30-minute `pnpm dev` smoke test before deleting the file. If the first-request-on-cold-isolate 500 reproduces, the issue is #10315 (still open), and the static `node:async_hooks` import workaround from the issue's reporter should be applied before deleting the route.
- [ ] Confirm `apps/web` and `apps/api` issue the same session cookie when both have their own `auth` instance (they share `process.env.BETTER_AUTH_SECRET` via `dotenv`, but `apps/web` was previously the only one to set the cookie; now the API would be). Cookie domain/path attributes need to be aligned (`trustedOrigins` already includes both, per `packages/auth/src/auth.ts:88`, but `secure` / `sameSite` / `domain` attributes on the `Set-Cookie` header need to match the previous web-app behavior or sessions won't survive cross-worker requests).
- [ ] Open a separate task: migrate the API worker off `@prisma/adapter-pg` to `@prisma/adapter-neon` (HTTP) to drop the 3.5 MB WASM blob and insulate against prisma#29660. Out of scope for "delete the workaround" but the only durable answer to "what about the WASM".
