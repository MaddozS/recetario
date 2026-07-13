# Task T4: UI spike (Button.astro)
Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T1 (completed), parallel with T3

## Goal

Validate that `.astro` components can live in a separate npm package. Extract `Button.astro` as a proof-of-concept. Verify it compiles, type-checks, and renders identically to pre-extraction.

This is a **decision point** task. If it succeeds, T6 (full UI extraction) proceeds. If it fails, T6 is skipped and UI stays in `apps/web/src/components/ui/`.

## Context

**Why this is risky**: The `.astro` file format is Astro-specific. Extracting it to a separate package means:
- The package needs `astro` as a `peerDependency` (so the consumer provides it)
- The package needs `astro-icon` as a `peerDependency` (Button.astro uses `<Icon>` from `astro-icon/components`)
- Vite needs to resolve `.astro` files when the consumer (apps/web) imports from the package
- Tailwind classes need to work (Button.astro uses Tailwind utility classes)

**The test**: extract one component, see if everything works. If yes, scale to 7 more. If no, abort the UI extraction strategy.

**What we're NOT doing in T4**:
- Extracting other UI components (T6)
- Extracting CSS tokens (T6)
- Extracting accent-colors, dialog, loading-overlay, password-toggle (T6)
- Touching any app-level components (Recipe*, Production*, etc. — those stay in apps/web)

## Task Scope

- **Type**: new + extends-existing
- **Pre-existing components**:
  - T1 output: `apps/web/src/components/ui/Button.astro` and `apps/web/src/components/ui/index.ts`
  - T1 output: `packages/ui/package.json` (placeholder)
  - All `apps/web/src/` files that import Button
- **New deliverables**:
  - `packages/ui/package.json` — updated with peerDeps, exports
  - `packages/ui/src/Button.astro` — moved from apps/web
  - `packages/ui/src/index.ts` — barrel exporting Button
  - Updated `apps/web/src/components/ui/Button.astro` — replaced with re-export from package
  - OR: directly updated all Button import sites in `apps/web/src/`
- **Dependencies**: T1 completed (verified ✓)

## Skills Required

- **design-system-verify**: For verifying Button renders with correct semantic tokens and no hardcoded colors.

## Files Involved

- `apps/web/src/components/ui/Button.astro` — read (to understand), then move
- `apps/web/src/components/ui/index.ts` — read (to understand current barrel)
- All `apps/web/src/` files that import Button — find and update

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `packages/ui/package.json` — modify (add peerDeps, exports, files)
- [ ] `packages/ui/src/Button.astro` — new (moved from apps/web)
- [ ] `packages/ui/src/index.ts` — new (barrel)
- [ ] `apps/web/src/components/ui/Button.astro` — modify (replace with re-export shim) OR delete
- [ ] `apps/web/src/components/ui/index.ts` — modify (re-export from @recetario/ui)
- [ ] Any file in `apps/web/src/` that imports Button — modify (update import path)
- [ ] `docs/tasks/task-20260620-1718-builder-t4-ui-spike-report.md` — the report file (mandatory)

## Technical Steps

1. **Load skill**: `design-system-verify`

2. **Read current Button.astro**:
   - Path: `apps/web/src/components/ui/Button.astro`
   - Note: imports (Icon from astro-icon/components), props, template structure, classes

3. **Read current UI barrel**:
   - Path: `apps/web/src/components/ui/index.ts`
   - Note: which components are exported

4. **Find all Button consumers in apps/web/src/**:
   ```bash
   grep -rln "from \"@/components/ui\"" apps/web/src/ | head -50
   grep -rln "import.*Button.*from \"@/components/ui\"" apps/web/src/ | head -50
   ```
   - List of files that import Button (or any UI component)
   - These files will be updated in step 11

5. **Update `packages/ui/package.json`**:
   ```json
   {
     "name": "@recetario/ui",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "exports": {
       ".": {
         "types": "./src/index.ts",
         "default": "./src/index.ts"
       },
       "./Button.astro": "./src/Button.astro"
     },
     "files": ["src"],
     "peerDependencies": {
       "astro": "^6.0.0",
       "astro-icon": "^1.0.0"
     }
   }
   ```
   - `peerDependencies` for astro + astro-icon (the consumer provides them)
   - `exports` includes both barrel entry and individual component path
   - `main` and `types` point to source (TypeScript path resolution)

6. **Create `packages/ui/src/Button.astro`** by copying from `apps/web/src/components/ui/Button.astro`:
   - Copy file contents verbatim
   - No logic changes
   - Same imports (Icon from astro-icon/components works because astro-icon is a peerDep)

7. **Create `packages/ui/src/index.ts`**:
   ```ts
   export { default as Button } from "./Button.astro";
   ```
   - Barrel exports Button
   - Other components will be added in T6

8. **Decide on apps/web/src/components/ui/Button.astro** — two options:
   - **Option A: Re-export shim** (minimal disruption, allows gradual migration):
     ```ts
     export { default } from "@recetario/ui/Button.astro";
     ```
   - **Option B: Delete** (clean, requires updating all consumers):
     - Delete `apps/web/src/components/ui/Button.astro`
     - Update all import sites

   **Recommendation**: Use **Option B** (delete + update consumers). It's cleaner and matches the spec's "code moves, not duplicated" principle. The spec says `apps/web/src/components/ui/index.ts` gets deleted in T6 anyway.

9. **Update `apps/web/src/components/ui/index.ts`** to re-export from package:
   ```ts
   export { Button } from "@recetario/ui";
   ```
   - This keeps existing imports `import { Button } from "@/components/ui"` working
   - For T6 we can decide whether to keep this shim or update all consumers
   - For T4, keep the shim to minimize disruption

10. **Reinstall to resolve new package**:
    ```bash
    pnpm install
    ```

11. **Verify build**:
    ```bash
    pnpm turbo run build
    ```
    - Should succeed
    - If Vite can't resolve the .astro import, this is where it fails

12. **Verify astro check**:
    ```bash
    pnpm --filter @recetario/web astro check
    ```
    - Should pass
    - Type errors here would indicate the package structure is wrong

13. **Verify dev server boots and Button renders**:
    ```bash
    timeout 15 pnpm --filter @recetario/web dev
    ```
    - Wait for "ready" message
    - Check that no errors appear in the boot log
    - The dev server should boot even if no specific page is hit

14. **Visual QA (lightweight)**:
    - Since this is a spike, just verify the build doesn't error on Button
    - Full visual QA happens in T5 (kitchcalc-validator)
    - If dev boots without errors, the spike passes from a build perspective

15. **Write report** to `docs/tasks/task-20260620-1718-builder-t4-ui-spike-report.md` with:
    - **Skills Used**: list (likely `design-system-verify`)
    - **Button.astro source**: brief summary of imports/structure
    - **Consumer count**: how many files import Button
    - **Package structure**: `packages/ui/` content
    - **Build result**: success/failure
    - **Astro check result**: success/failure
    - **Dev server result**: success/failure
    - **Issues encountered**: any + how resolved
    - **Spike verdict**: PASS or FAIL with rationale
    - **Recommendation**: continue to T6 (full UI extraction) or abort

## Expected Output

- **Code changes**:
  - `packages/ui/package.json` updated with peerDeps + exports
  - `packages/ui/src/Button.astro` created
  - `packages/ui/src/index.ts` created (barrel)
  - `apps/web/src/components/ui/Button.astro` deleted or replaced with re-export shim
  - `apps/web/src/components/ui/index.ts` updated to re-export from `@recetario/ui`
  - All Button import sites in `apps/web/src/` updated (if Option B)
- **Report**: `docs/tasks/task-20260620-1718-builder-t4-ui-spike-report.md` with verdict (PASS/FAIL)

## Guardrails

- **DO NOT** modify Button.astro content (just move it). Visual regression check is for T5.
- **DO NOT** extract other UI components (T6 does that).
- **DO NOT** extract CSS tokens (T6 does that).
- **DO NOT** touch app components (Recipe*, Production*, etc.).
- **DO NOT** install new dependencies.
- **DO NOT** commit changes.
- **MUST** verify build passes before declaring done.
- **MUST** verify astro check passes before declaring done.
- **MUST** verify dev server boots without errors.
- **MUST** keep `Button.astro` byte-identical to original (no logic changes).
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands.
- **MUST** use `peerDependencies` (NOT `dependencies`) for astro and astro-icon.
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files.
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list. If new files are needed, STOP and report.
- **Read discipline**: Max 15 file reads. Should be ~5 reads (Button.astro, UI barrel, consumer list, etc.).
