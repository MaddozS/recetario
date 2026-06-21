---
name: monorepo-practices
description: Monorepo best practices for KitchCalc (Recetario) — workspace wiring, SSR-safe exports, pre-compilation, tooling at root, and cross-package conventions. Load before extracting new workspace packages or troubleshooting SSR build errors.
license: MIT
metadata:
  author: kitchcalc
  version: "1.0.0"
---

# Monorepo Practices (KitchCalc / Recetario)

Best practices for the pnpm + Turborepo monorepo. Load this skill before extracting a new workspace package from `apps/web` or troubleshooting SSR build errors.

## Overview

The Recetario monorepo uses **pnpm workspaces** (`pnpm-workspace.yaml`) with **Turborepo** for task orchestration. Six packages live under `packages/`:

| Package       | Contents                          | Needs Build |
|---------------|-----------------------------------|-------------|
| `@recetario/db`     | Prisma client, DB helpers         | Yes (tsc + generated) |
| `@recetario/auth`   | Better Auth setup, rate limiting  | Yes (tsc)  |
| `@recetario/billing`| Stripe, subscription logic        | Yes (tsc)  |
| `@recetario/ui`     | Astro components + client JS      | Partial (ts helpers only) |
| `@recetario/types`  | Shared TypeScript types           | Yes (tsc)  |
| `@recetario/config` | tsconfig, eslint, prettier config | No         |

## Shared Tooling at Root

**All shared dev tooling must be declared in root `package.json`, NOT in individual package devDependencies.** pnpm hoists root deps into the workspace root `node_modules`, making them available to every package via strict ESM resolution.

Required root devDependencies:

```json
{
  "devDependencies": {
    "@astrojs/check": "0.9.9",
    "turbo": "^2.9.18",
    "typescript": "6.0.3",
    "eslint": "10.4.0",
    "prettier": "3.8.3"
  }
}
```

**Why**: Individual packages that list these as devDependencies will have them installed in their own `node_modules/` directory, which can cause resolution conflicts — pnpm's strict ESM resolution may not find the binary. Root-level installation guarantees single-source resolution.

## Workspace Dep Wiring (3-Step Pattern)

When extracting a new package:

1. **Declare the dependency** in the consumer's `package.json`:
   ```json
   "dependencies": {
     "@recetario/db": "workspace:^"
   }
   ```
   Use `workspace:^` to let pnpm resolve the version from the workspace. Never use a hard version like `"0.0.0"` — this breaks symlink resolution in development.

2. **Run install**:
   ```bash
   pnpm install
   ```
   This creates a symlink from `node_modules/@recetario/db` → `packages/db`.

3. **TypeScript resolution** — The root `tsconfig.base.json` has path mappings:
   ```json
   "paths": {
     "@recetario/*": ["../../packages/*/src"]
   }
   ```
   These are used by the IDE and `astro check`. The compiled output (dist/) handles runtime resolution.

## Raw .ts Exports + SSR

**Problem**: When a package exports raw `.ts` files (e.g., `"main": "./src/index.ts"`), Astro/Vite's SSR pipeline must process them. If those `.ts` files import modules that use Node.js native APIs (crypto, webcrypto), Vite's SSR bundling crashes.

**Symptoms**:
```
[vite] Error: "webcrypto" is not exported by "__vite_ssr_import_0__"
Error: Could not load .../generated/prisma/client.ts (imported by .../packages/db/src/prisma.ts)
```

**Fix**: Pre-compile packages to JS. Update `package.json`:
```json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

Then add `dist/` to `.gitignore`:
```
packages/*/dist/
```

## Single-Quote Import Check

When a package is extracted from `apps/web`, ensure no internal imports remain:

```bash
grep -rEn "from\s*'@/lib/[module-name]'" apps/web/src/
```

This must return 0 results. Any match means the extracted package still references `apps/web/src/lib/` internals, which won't resolve in the package context.

If matches exist, update those imports to use the package's own exports or `@recetario/*` workspace deps.

## README Requirement

Every package must have a `README.md` covering:
- **What** the package does
- **Usage** — how to import and use the main exports
- **Environment variables** — required env vars (e.g., `DATABASE_URL`, `STRIPE_SECRET_KEY`)
- **peerDependencies** — required peer packages that consumers must provide
- **Exports** — the package's public API surface

Example README structure: see `packages/db/README.md`.

## Pre-Compilation Strategies

Three approaches for compiling TS packages to JS:

### 1. tsc (TypeScript Compiler) — Current approach

Best for: simple TS packages with no bundling needs.
```json
"build": "tsc --build tsconfig.build.json"
```

Pros: Zero config overhead. Handles `.ts` extension rewriting with `module: "NodeNext"`.
Cons: No bundling, no tree-shaking, no minification. Cannot compile `.astro` files.

### 2. tsup (esbuild-based) — Alternative for smaller bundles

```json
"build": "tsup src/index.ts --format esm --dts"
```

Pros: Fast, produces single-file bundles, tree-shaking, supports `.ts` and `.tsx`.
Cons: Does not compile `.astro` files. Different config from tsc.

### 3. tshy (hybrid CJS/ESM) — For dual-format packages

```json
"tshy": {
  "exports": "./src/index.ts",
  "dialects": ["esm", "commonjs"]
}
```

Pros: Produces both ESM and CJS output automatically. Good for libraries consumed by both module systems.
Cons: Overkill for a fully-ESM monorepo. Not needed when `"type": "module"` is set at the package level.

**Decision**: Use `tsc` for all current packages. Only consider `tsup` or `tshy` if a future package needs bundling or dual-format output.

### Building the db package (special case)

The `@recetario/db` package has a unique setup: Prisma generates `.ts` files to `generated/prisma/`. These files import each other with `.ts` extensions (e.g., `import * from "./enums.ts"`). When compiling:

- `tsconfig.json` sets `rootDir: "."` to include both `src/` and `generated/prisma/`
- Uses `module: "NodeNext"` to rewrite `.ts` extensions to `.js` in output
- Output: `dist/src/` (source) + `dist/generated/prisma/` (prisma generated)
- The relative import in `src/prisma.ts`: `import from "../generated/prisma/client.js"` → resolves to `dist/generated/prisma/client.js` at runtime ✓

## Cross-References

- **prisma-client-api skill**: Covers writing Prisma queries, model operations, transactions. Load when modifying `packages/db/src/` files.
- **better-auth-best-practices skill**: Covers auth configuration, session management. Load when modifying `packages/auth/src/` files.
- **stripe-best-practices skill**: Covers Stripe API usage, webhooks, subscription handling. Load when modifying `packages/billing/src/` files.
- **AGENTS.md**: Repository-wide conventions — data invariants, import paths, auth, UI patterns.

## Examples

### Adding a workspace dep to a consumer

```bash
# consumer: apps/web
# Add to apps/web/package.json:
# "dependencies": { "@recetario/db": "workspace:^" }

pnpm install
# Now: import { prisma } from "@recetario/db" works in any .ts/.astro file
```

### Compiling a package

```bash
cd packages/db
pnpm run build
# Output: packages/db/dist/src/index.js
#                   dist/generated/prisma/client.js
```

### Fixing "webcrypto is not exported" SSR error

```bash
# 1. Ensure all packages have build scripts
ls packages/*/package.json | xargs grep '"build"'

# 2. Run full build
pnpm turbo run build

# 3. Verify astro check
pnpm --filter @recetario/web astro check
```

### Adding a new package to the monorepo

1. Create `packages/<name>/package.json` with workspace name
2. Create `packages/<name>/tsconfig.json` (extend `@recetario/config/tsconfig.base.json`)
3. Create `packages/<name>/tsconfig.build.json` (extend `./tsconfig.json`)
4. Add `"build": "tsc --build tsconfig.build.json"` script
5. Wire deps: `pnpm install --filter @recetario/<consumer> --filter @recetario/<new>`
6. Run single-quote import check (see above)
7. Create README
8. `pnpm turbo run build` — verify the whole chain compiles
