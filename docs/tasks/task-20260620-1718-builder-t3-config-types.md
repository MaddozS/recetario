# Task T3: Config + Types packages
Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T1 (completed)

## Goal

Create `packages/config/` with shared `tsconfig.base.json`, `eslint.base.cjs`, `prettier.base.json` bases. Create `packages/types/` as an empty starter package. Update `apps/web/tsconfig.json`, root `.eslintrc.cjs`, and root `.prettierrc.json` to extend the new bases.

## Context

After T1, all apps/packages have empty `package.json` placeholders. This task populates the `config` and `types` packages, and wires up the apps to extend them.

**Why a `config` package**: Centralize shared tsconfig/eslint/prettier bases. As more packages are added (db, auth, billing, ui), they all extend these bases — no duplication, consistent tooling.

**Why a `types` package**: A neutral home for shared TypeScript types. Currently empty (no Zod schemas exist per the explore report). Will be populated incrementally as new features need shared types.

## Task Scope

- **Type**: new + extends-existing
- **Pre-existing components**:
  - T1 output: `apps/web/tsconfig.json`, root `.eslintrc.cjs`, root `.prettierrc.json`
  - Empty placeholder packages: `packages/config/package.json`, `packages/types/package.json`
- **New deliverables**:
  - `packages/config/tsconfig.base.json` — extends `astro/tsconfigs/strict` with path mapping for `@recetario/*`
  - `packages/config/eslint.base.cjs` — extends current root config, removes app-specific rules
  - `packages/config/prettier.base.json` — same as current
  - `packages/types/src/index.ts` — placeholder export
  - `packages/types/package.json` — updated with main entry
  - Updated `apps/web/tsconfig.json` — extends `@recetario/config/tsconfig.base.json`
  - Updated root `.eslintrc.cjs` — extends `@recetario/config/eslint.base.cjs`
  - Updated root `.prettierrc.json` — extends `@recetario/config/prettier.base.json`
- **Dependencies**: T1 completed (verified ✓)

## Skills Required

None. This is config setup.

## Files Involved

- `apps/web/tsconfig.json` (current) — read + modify to extend
- `.eslintrc.cjs` (root) — read + modify to extend
- `.prettierrc.json` (root) — read + modify to extend
- `packages/config/package.json` (placeholder) — read + update with exports
- `packages/types/package.json` (placeholder) — read + update with main entry

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `packages/config/package.json` — modify (add main/exports/files)
- [ ] `packages/config/tsconfig.base.json` — new
- [ ] `packages/config/eslint.base.cjs` — new
- [ ] `packages/config/prettier.base.json` — new
- [ ] `packages/types/package.json` — modify (add main/exports/files)
- [ ] `packages/types/src/index.ts` — new
- [ ] `apps/web/tsconfig.json` — modify (extend base)
- [ ] `.eslintrc.cjs` (root) — modify (extend base)
- [ ] `.prettierrc.json` (root) — modify (extend base)
- [ ] `docs/tasks/task-20260620-1718-builder-t3-config-types-report.md` — the report file (mandatory)

## Technical Steps

1. **Read current configs**:
   - `apps/web/tsconfig.json` — note current extends, compilerOptions, include, exclude
   - `.eslintrc.cjs` (root) — note current rules, extends, plugins
   - `.prettierrc.json` (root) — note current options

2. **Create `packages/config/tsconfig.base.json`**:
   ```json
   {
     "extends": "astro/tsconfigs/strict",
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@recetario/*": ["../../packages/*/src"]
       },
       "moduleResolution": "bundler",
       "module": "ESNext",
       "target": "ESNext",
       "verbatimModuleSyntax": true,
       "isolatedModules": true,
       "esModuleInterop": true,
       "resolveJsonModule": true,
       "skipLibCheck": true,
       "strict": true,
       "noUncheckedIndexedAccess": true
     }
   }
   ```
   - Extends Astro strict base
   - Adds path mapping for cross-package imports
   - `noUncheckedIndexedAccess: true` is a strict mode flag worth keeping

3. **Update `packages/config/package.json`**:
   ```json
   {
     "name": "@recetario/config",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "files": [
       "tsconfig.base.json",
       "eslint.base.cjs",
       "prettier.base.json"
     ],
     "exports": {
       "./tsconfig.base.json": "./tsconfig.base.json",
       "./eslint.base.cjs": "./eslint.base.cjs",
       "./prettier.base.json": "./prettier.base.json"
     }
   }
   ```

4. **Create `packages/config/eslint.base.cjs`**:
   ```js
   module.exports = {
     root: false,
     env: {
       browser: true,
       node: true,
       es2022: true,
     },
     parser: '@typescript-eslint/parser',
     parserOptions: {
       ecmaVersion: 'latest',
       sourceType: 'module',
       ecmaFeatures: { jsx: true },
     },
     plugins: ['@typescript-eslint'],
     extends: [
       'eslint:recommended',
       'plugin:@typescript-eslint/recommended',
     ],
     rules: {
       '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
       'no-console': 'off',
     },
     ignorePatterns: [
       'node_modules/',
       'dist/',
       '.vercel/',
       '.astro/',
       'generated/',
       '*.config.js',
       '*.config.mjs',
       '*.config.cjs',
     ],
   };
   ```
   - Base config, no app-specific rules
   - Apps extend this and add their own rules

5. **Create `packages/config/prettier.base.json`**:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "trailingComma": "es5",
     "tabWidth": 2,
     "printWidth": 100,
     "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
     "overrides": [
       {
         "files": "*.astro",
         "options": { "parser": "astro" }
       }
     ]
   }
   ```
   - Mirrors current root `.prettierrc.json`
   - Astro + Tailwind plugins

6. **Update `apps/web/tsconfig.json`** to extend the base:
   ```json
   {
     "extends": "@recetario/config/tsconfig.base.json",
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"],
         "@recetario/*": ["../../packages/*/src"]
       }
     },
     "include": [".astro/types.d.ts", "**/*"],
     "exclude": ["dist", ".agent/**", ".astro/**", "node_modules/**", ".vercel/**", "../../packages/**/node_modules", "../../packages/**/dist"]
   }
   ```
   - Extends the new base config
   - Adds `@/*` alias for app-internal imports
   - Adds `@recetario/*` alias for cross-package imports
   - Excludes packages' build outputs to avoid type conflicts
   - **KNOWN BUG**: AGENTS.md mentions a tsconfig exclude bug; preserve the existing string `["dist", ".agent/**", ".astro/**", "node_modules/**", ".vercel/**"]` structure as separate entries, don't combine them

7. **Update root `.eslintrc.cjs`** to extend the base:
   ```js
   module.exports = {
     root: true,
     extends: ['@recetario/config/eslint.base.cjs'],
     overrides: [
       {
         files: ['*.astro'],
         parser: 'astro-eslint-parser',
         plugins: ['astro'],
         extends: ['plugin:astro/recommended'],
       },
     ],
   };
   ```
   - Root config that just extends the base
   - Adds Astro-specific overrides

8. **Update root `.prettierrc.json`** to extend the base:
   ```json
   {
     "extends": "@recetario/config/prettier.base.json"
   }
   ```
   - Minimal — just extends

9. **Create `packages/types/src/index.ts`**:
   ```ts
   // Shared types live here.
   // Currently empty — populated incrementally as new features need cross-package types.
   export {};
   ```
   - Empty placeholder
   - `export {}` makes it a module (otherwise it would be a global script)

10. **Update `packages/types/package.json`**:
    ```json
    {
      "name": "@recetario/types",
      "version": "0.0.0",
      "private": true,
      "type": "module",
      "main": "./src/index.ts",
      "types": "./src/index.ts",
      "exports": {
        ".": {
          "types": "./src/index.ts",
          "default": "./src/index.ts"
        }
      },
      "files": ["src"]
    }
    ```
    - `main` and `types` point to source (since we're not building TS in this refactor)
    - Consumers can import via `@recetario/types`

11. **Reinstall** to resolve new package exports:
    ```bash
    pnpm install
    ```

12. **Verify type-check still works**:
    ```bash
    pnpm turbo run type-check
    ```
    - Should pass with same hints as pre-refactor
    - If new errors appear, the base config might be too strict — relax flags

13. **Verify ESLint still works**:
    ```bash
    pnpm eslint .
    ```
    - Should pass (no new errors)
    - If new errors, the base config might be too strict — relax flags

14. **Verify Prettier still works**:
    ```bash
    pnpm format
    ```
    - Should run without errors
    - Should not change any files (configs are equivalent)

15. **Verify build still works**:
    ```bash
    pnpm turbo run build
    ```

16. **Write report** to `docs/tasks/task-20260620-1718-builder-t3-config-types-report.md` with:
    - **Skills Used**: list (likely `none`)
    - **Files created**: list
    - **Files modified**: list with diff summary
    - **Verification commands run**: results
    - **Issues encountered**: any + how resolved
    - **Decision on T5**: T3 is done; T4 will validate UI spike independently

## Expected Output

- **Code changes**:
  - 3 new files in `packages/config/`: `tsconfig.base.json`, `eslint.base.cjs`, `prettier.base.json`
  - 1 new file in `packages/types/`: `src/index.ts`
  - Updated `packages/config/package.json` and `packages/types/package.json`
  - Updated `apps/web/tsconfig.json` (extends base)
  - Updated root `.eslintrc.cjs` (extends base)
  - Updated root `.prettierrc.json` (extends base)
- **Report**: `docs/tasks/task-20260620-1718-builder-t3-config-types-report.md`

## Guardrails

- **DO NOT** add new dependencies (eslint plugins, prettier plugins, etc.). Use what's in `apps/web/package.json` already.
- **DO NOT** change compiler options in the base unless absolutely necessary — keep the same as the current `apps/web/tsconfig.json`.
- **DO NOT** modify `apps/web/astro.config.mjs` or other Vite/Tailwind config.
- **DO NOT** remove any existing ESLint rules from the base — the goal is to preserve current behavior.
- **DO NOT** add new ESLint or Prettier rules — the user can add them in follow-up tasks.
- **MUST** preserve the known tsconfig exclude bug per AGENTS.md (the comment in line 121 of AGENTS.md).
- **MUST** verify all checks pass (`type-check`, `eslint`, `prettier`, `build`) before declaring done.
- **MUST** use `pnpm exec` or `pnpm dlx` for any terminal commands (per AGENTS.md).
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files.
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list.
- **Read discipline**: Max 15 file reads. Should be ~3 reads (current configs).
