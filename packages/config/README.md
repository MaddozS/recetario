# `@recetario/config` — Shared config bases

TypeScript, ESLint, and Prettier base configs shared across all KitchCalc packages.

## What's inside

- `tsconfig.base.json` — base TypeScript config (strict mode, ES2022 target, moduleResolution bundler)
- `eslint.base.*` — base ESLint configuration
- `prettier.base.*` — base Prettier configuration (if extracted)

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
