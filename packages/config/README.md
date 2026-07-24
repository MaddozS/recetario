# `@recetario/config` — Shared config bases

TypeScript, ESLint, and Prettier base configs shared across all KitchCalc packages.

## What's inside

- `tsconfig.base.json` — base TypeScript config (strict mode, ES2022 target, moduleResolution bundler)
- `eslint.base.*` — base ESLint configuration
- `prettier.base.*` — base Prettier configuration (if extracted)
- `./lazy` — lazyInit factory for HMR-safe deferred client creation

## Usage

Extend in individual package `tsconfig.json`:

```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## `lazyInit<T>(key, initFn)`

One-liner for lazy, singleton-guarded, HMR-safe client initialization.

```ts
import { lazyInit } from "@recetario/config/lazy";

export const prisma = lazyInit("prisma", () => new PrismaClient());
```

- First property access calls `initFn` and caches the result.
- Cache lives on `globalThis`, surviving Vite SSR HMR reloads.
- Exceptions propagate unmodified; no retry on failure.
