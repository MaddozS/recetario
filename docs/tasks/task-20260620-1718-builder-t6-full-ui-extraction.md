# Task T6: Full UI extraction
Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T5 PASS (verified ✓)

## Goal

Extract the remaining 7 `.astro` UI components (Card, Input, Badge, Dialog, FinancialSummary, SectionHeading, PasswordInput), the CSS tokens (from `global.css`), and 4 utility files (accent-colors, dialog, loading-overlay, password-toggle) from `apps/web/src/` to `packages/ui/src/`. Update all consumers. Verify the full UI package works identically to pre-extraction.

This is Phase 2 of the monorepo refactor (full UI extraction after the T4/T5 spike validated the approach).

## Context

T4 successfully extracted `Button.astro` to `packages/ui/src/`. T5 verified the extraction works. This task extends the pattern to the remaining 7 components + CSS tokens + 4 utilities.

**What moves to `packages/ui/src/`**:
- 7 `.astro` files: Card, Input, Badge, Dialog, FinancialSummary, SectionHeading, PasswordInput
- 4 `.ts` files: accent-colors.ts, dialog.ts, loading-overlay.ts, password-toggle.ts
- 1 CSS file: tokens.css (extracted from `apps/web/src/styles/global.css` — the `@theme` block + CSS variables only)

**What stays in `apps/web/src/`**:
- `components/ui/` will be empty after this task (T4 already moved Button.astro)
- `styles/global.css` stays but only with non-token content (animations, custom utilities). Will `@import` tokens from `@recetario/ui`.

**The `apps/web/src/components/ui/index.ts` barrel**: This was kept as a re-export shim from `@recetario/ui` in T4. Decision: keep it (consumers continue to work without changes), OR delete it and update all `import { ... } from "@/components/ui"` to use `@recetario/ui` directly.

The plan says "Update all `import { ... } from "@/components/ui"` in `apps/web/src/` → `import { ... } from "@recetario/ui"`". So update consumers and delete the barrel.

**Why not keep the shim**: Cleaner separation. T4's shim was temporary to make the spike work without touching consumers. T6 is the "real" extraction.

## Task Scope

- **Type**: extends-existing
- **Pre-existing components**:
  - T4 output: `packages/ui/src/Button.astro` and `packages/ui/src/index.ts` (already in package)
  - T1 output: `apps/web/src/components/ui/{Card,Input,Badge,Dialog,FinancialSummary,SectionHeading,PasswordInput}.astro`
  - T1 output: `apps/web/src/styles/global.css` (has `@theme` block + animations + utilities)
  - T1 output: `apps/web/src/lib/{accent-colors,dialog,loading-overlay,password-toggle}.ts`
  - All consumer files importing from `@/components/ui` or `@/lib/{accent-colors,dialog,loading-overlay,password-toggle}`
- **New deliverables**:
  - 7 `.astro` files in `packages/ui/src/`
  - 4 `.ts` files in `packages/ui/src/`
  - 1 `tokens.css` in `packages/ui/src/`
  - Updated `packages/ui/src/index.ts` with all components + utilities
  - Updated `apps/web/src/styles/global.css` with `@import "@recetario/ui/tokens.css"` + remaining non-token content
  - Deleted `apps/web/src/components/ui/` directory
  - All consumer import paths updated
- **Dependencies**: T5 PASS (verified ✓)

## Skills Required

- **design-system-verify**: For verifying all components use semantic tokens, no hardcoded colors

## Files Involved

**Files to read (current state)**:
- 7 `.astro` files in `apps/web/src/components/ui/`
- `apps/web/src/styles/global.css` (extract `@theme` block)
- 4 `.ts` utility files
- `apps/web/src/components/ui/index.ts` (current barrel)

**Files to find consumers**:
- `grep -rln "from \"@/components/ui\"" apps/web/src/` — many files
- `grep -rln "from \"@/lib/accent-colors\"" apps/web/src/`
- `grep -rln "from \"@/lib/dialog\"" apps/web/src/`
- `grep -rln "from \"@/lib/loading-overlay\"" apps/web/src/`
- `grep -rln "from \"@/lib/password-toggle\"" apps/web/src/`

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `packages/ui/src/Card.astro` — new (moved)
- [ ] `packages/ui/src/Input.astro` — new (moved)
- [ ] `packages/ui/src/Badge.astro` — new (moved)
- [ ] `packages/ui/src/Dialog.astro` — new (moved)
- [ ] `packages/ui/src/FinancialSummary.astro` — new (moved)
- [ ] `packages/ui/src/SectionHeading.astro` — new (moved)
- [ ] `packages/ui/src/PasswordInput.astro` — new (moved)
- [ ] `packages/ui/src/accent-colors.ts` — new (moved)
- [ ] `packages/ui/src/dialog.ts` — new (moved)
- [ ] `packages/ui/src/loading-overlay.ts` — new (moved)
- [ ] `packages/ui/src/password-toggle.ts` — new (moved)
- [ ] `packages/ui/src/tokens.css` — new (extracted from global.css)
- [ ] `packages/ui/src/index.ts` — modify (add all 7 components + 4 utilities exports)
- [ ] `packages/ui/package.json` — modify (add tokens.css to exports/files)
- [ ] `apps/web/src/styles/global.css` — modify (remove `@theme` block, add `@import "@recetario/ui/tokens.css"`)
- [ ] `apps/web/src/components/ui/index.ts` — delete
- [ ] `apps/web/src/components/ui/Card.astro` — delete
- [ ] `apps/web/src/components/ui/Input.astro` — delete
- [ ] `apps/web/src/components/ui/Badge.astro` — delete
- [ ] `apps/web/src/components/ui/Dialog.astro` — delete
- [ ] `apps/web/src/components/ui/FinancialSummary.astro` — delete
- [ ] `apps/web/src/components/ui/SectionHeading.astro` — delete
- [ ] `apps/web/src/components/ui/PasswordInput.astro` — delete
- [ ] `apps/web/src/lib/accent-colors.ts` — delete
- [ ] `apps/web/src/lib/dialog.ts` — delete
- [ ] `apps/web/src/lib/loading-overlay.ts` — delete
- [ ] `apps/web/src/lib/password-toggle.ts` — delete
- [ ] All consumer files in `apps/web/src/` — modify (update import paths to `@recetario/ui`)
- [ ] `docs/tasks/task-20260620-1718-builder-t6-full-ui-extraction-report.md` — the report file (mandatory)

## Technical Steps

1. **Load skill**: `design-system-verify`

2. **Read all files to be moved**:
   - 7 `.astro` files
   - 4 `.ts` utility files
   - `apps/web/src/styles/global.css` (note the `@theme` block + CSS variables + everything else)

3. **Find all consumers**:
   ```bash
   grep -rln "from \"@/components/ui\"" apps/web/src/ > /tmp/ui-consumers.txt
   grep -rln "from \"@/lib/accent-colors\"" apps/web/src/ >> /tmp/ui-consumers.txt
   grep -rln "from \"@/lib/dialog\"" apps/web/src/ >> /tmp/ui-consumers.txt
   grep -rln "from \"@/lib/loading-overlay\"" apps/web/src/ >> /tmp/ui-consumers.txt
   grep -rln "from \"@/lib/password-toggle\"" apps/web/src/ >> /tmp/ui-consumers.txt
   cat /tmp/ui-consumers.txt | sort -u | wc -l  # Count
   ```
   - Document the count of consumer files

4. **Create `packages/ui/src/tokens.css`** by extracting the `@theme` block + CSS variables from `apps/web/src/styles/global.css`:
   - Read the global.css
   - Identify the `@theme` block (Tailwind 4 syntax)
   - Identify any CSS custom properties (`:root { --var: ... }`)
   - Copy these to `packages/ui/src/tokens.css`
   - Do NOT copy animations, custom utilities (`.label-tracked`, `.section-label`, etc.), or other non-token CSS

5. **Move 7 `.astro` files**:
   ```bash
   mv apps/web/src/components/ui/Card.astro packages/ui/src/Card.astro
   mv apps/web/src/components/ui/Input.astro packages/ui/src/Input.astro
   mv apps/web/src/components/ui/Badge.astro packages/ui/src/Badge.astro
   mv apps/web/src/components/ui/Dialog.astro packages/ui/src/Dialog.astro
   mv apps/web/src/components/ui/FinancialSummary.astro packages/ui/src/FinancialSummary.astro
   mv apps/web/src/components/ui/SectionHeading.astro packages/ui/src/SectionHeading.astro
   mv apps/web/src/components/ui/PasswordInput.astro packages/ui/src/PasswordInput.astro
   ```

6. **Move 4 `.ts` utility files**:
   ```bash
   mv apps/web/src/lib/accent-colors.ts packages/ui/src/accent-colors.ts
   mv apps/web/src/lib/dialog.ts packages/ui/src/dialog.ts
   mv apps/web/src/lib/loading-overlay.ts packages/ui/src/loading-overlay.ts
   mv apps/web/src/lib/password-toggle.ts packages/ui/src/password-toggle.ts
   ```

7. **Verify byte-identical** for each moved file (no logic changes):
   ```bash
   diff -q apps/web/src/components/ui/Card.astro packages/ui/src/Card.astro  # Should be silent after move
   ```
   - Since we just `mv`, files are identical. The diff check is for verification.

8. **Update `packages/ui/src/index.ts`** to export all 7 components + 4 utilities:
   ```ts
   export { default as Button } from "./Button.astro";
   export { default as Card } from "./Card.astro";
   export { default as Input } from "./Input.astro";
   export { default as Badge } from "./Badge.astro";
   export { default as Dialog } from "./Dialog.astro";
   export { default as FinancialSummary } from "./FinancialSummary.astro";
   export { default as SectionHeading } from "./SectionHeading.astro";
   export { default as PasswordInput } from "./PasswordInput.astro";
   export * from "./accent-colors";
   export * from "./dialog";
   export * from "./loading-overlay";
   export * from "./password-toggle";
   ```
   - Note: `export *` for utility files depends on whether they have named exports
   - Check each utility file's exports and adjust

9. **Update `packages/ui/package.json`** to add `tokens.css` to exports:
   ```json
   {
     "exports": {
       ".": {
         "types": "./src/index.ts",
         "default": "./src/index.ts"
       },
       "./Button.astro": "./src/Button.astro",
       "./Card.astro": "./src/Card.astro",
       "./Input.astro": "./src/Input.astro",
       "./Badge.astro": "./src/Badge.astro",
       "./Dialog.astro": "./src/Dialog.astro",
       "./FinancialSummary.astro": "./src/FinancialSummary.astro",
       "./SectionHeading.astro": "./src/SectionHeading.astro",
       "./PasswordInput.astro": "./src/PasswordInput.astro",
       "./tokens.css": "./src/tokens.css",
       "./accent-colors": "./src/accent-colors.ts",
       "./dialog": "./src/dialog.ts",
       "./loading-overlay": "./src/loading-overlay.ts",
       "./password-toggle": "./src/password-toggle.ts"
     }
   }
   ```
   - Each component has an explicit path (Vite needs to resolve .astro files individually)
   - `tokens.css` for the CSS import

10. **Update `apps/web/src/styles/global.css`**:
    - Remove the `@theme` block and CSS variables (now in `tokens.css`)
    - Add at the top: `@import "@recetario/ui/tokens.css";`
    - Keep all animations, custom utilities, and other non-token content
    - Preserve the structure as much as possible

11. **Delete `apps/web/src/components/ui/` directory**:
    ```bash
    rm apps/web/src/components/ui/index.ts
    rmdir apps/web/src/components/ui
    ```

12. **Update all consumers in `apps/web/src/`** to use `@recetario/ui` directly:
    ```bash
    # Update UI barrel imports
    grep -rln "from \"@/components/ui\"" apps/web/src/ | xargs sed -i '' 's|from "@/components/ui"|from "@recetario/ui"|g'
    grep -rln "from '\''@/components/ui'\''" apps/web/src/ | xargs sed -i '' "s|from '@/components/ui'|from '@recetario/ui'|g"

    # Update utility imports
    grep -rln "from \"@/lib/accent-colors\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/accent-colors"|from "@recetario/ui/accent-colors"|g'
    grep -rln "from \"@/lib/dialog\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/dialog"|from "@recetario/ui/dialog"|g'
    grep -rln "from \"@/lib/loading-overlay\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/loading-overlay"|from "@recetario/ui/loading-overlay"|g'
    grep -rln "from \"@/lib/password-toggle\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/password-toggle"|from "@recetario/ui/password-toggle"|g'
    ```
    - Use the explicit path (`@recetario/ui/accent-colors`) rather than re-exporting from the barrel, to keep tree-shaking efficient

13. **Reinstall**:
    ```bash
    pnpm install
    ```

14. **Verify build**:
    ```bash
    pnpm turbo run build
    ```
    - Should succeed with all 8 components + 4 utilities

15. **Verify astro check**:
    ```bash
    pnpm --filter @recetario/web astro check
    ```
    - Should report 0 errors

16. **Verify dev server**:
    ```bash
    cd apps/web && timeout 15 pnpm dev
    ```
    - Should boot

17. **Verify design system compliance**:
    ```bash
    grep -rnE 'bg-(red|blue|green|slate|gray|zinc|neutral|...)---[0-9]' packages/ui/src/
    ```
    - Should return 0 matches (no hardcoded colors in any moved file)

18. **Verify component barrel works**:
    - Open `packages/ui/src/index.ts`
    - Confirm all 8 components + 4 utilities are exported

19. **Write report** to `docs/tasks/task-20260620-1718-builder-t6-full-ui-extraction-report.md` with:
    - **Skills Used**: list (e.g., `design-system-verify`)
    - **Files moved**: list (12 files)
    - **Files deleted**: list
    - **Files modified**: list (consumers + global.css + package.json)
    - **Consumer count updated**: how many files had imports updated
    - **Build / check / dev**: all pass
    - **Design system check**: no hardcoded colors
    - **Issues encountered**: any + how resolved

## Expected Output

- **Code changes**:
  - 7 `.astro` components + 4 `.ts` utilities + 1 `tokens.css` in `packages/ui/src/`
  - Updated `packages/ui/src/index.ts` barrel
  - Updated `packages/ui/package.json` with new exports
  - Updated `apps/web/src/styles/global.css` with `@import` and removed `@theme`
  - Deleted `apps/web/src/components/ui/` directory
  - All consumer imports updated
- **Report**: `docs/tasks/task-20260620-1718-builder-t6-full-ui-extraction-report.md`

## Guardrails

- **DO NOT** modify any `.astro` component content (just move)
- **DO NOT** modify any `.ts` utility content (just move)
- **DO NOT** add new dependencies
- **DO NOT** commit changes
- **DO NOT** extract the `tailwindcss/vite` plugin or `astro-icon` allowlist (those stay in `apps/web/astro.config.mjs`)
- **DO NOT** run `pnpm eslint .` or `pnpm format` (pre-existing T1 broken state)
- **MUST** preserve byte-identical content for all moved files (no logic changes)
- **MUST** verify build, astro check, dev server all pass before declaring done
- **MUST** verify no hardcoded colors in `packages/ui/src/`
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list. If new files are needed, STOP and report.
- **Read discipline**: Max 15 file reads. Should be ~12 reads (7 .astro + 4 .ts + global.css + barrel + count).
