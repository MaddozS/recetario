# Reviewer Report: task-20260702-recipe-fixes-v4-validate

## Review Scope
- Spec: implicit from review instructions (v4 recipe page changes)
- Builder report: N/A (validation-only, not from a builder task)
- Files reviewed:
  - `apps/web/src/pages/recipes/[recipe].astro`

## Parallel Context
- Parallel group: none
- Review mode: standalone validation
- Sibling reviewer tasks: none

## Skills Used
Selected:
- `design-system-verify` — verify UI conventions, ARIA, icon whitelist, semantic tokens, no hardcoded colors
- `ponytail-review` — baseline review lens for over-engineering / defects

## Findings

| Severity | File | Issue | Evidence | Required Action |
|----------|------|-------|----------|-----------------|
| should-fix | `apps/web/src/pages/recipes/[recipe].astro:1358` | Regional Spanish "Hacé" used instead of neutral Spanish | Line 1358: `Hacé clic en <strong>Editar</strong> para agregar la preparación de esta receta.` — "Hacé" is vos-form, violates AGENTS.md rule: "User-facing UI copy uses neutral Spanish and avoids regional forms such as tenés, hacé, vos, che, or similar." | Change `Hacé` → `Haz` (standard imperative) |
| should-fix | `apps/web/src/pages/recipes/[recipe].astro:1543` | Hash change handler omits 'preparacion' tab | Line 1543: `if (['ingredientes', 'costos-fijos', 'presentaciones'].includes(hash))` — 'preparacion' is missing, so navigating directly to `#preparacion` via URL hash won't activate the tab. The initial tab activation (line 1498) does support 'preparacion' via sessionStorage/hash, but the hash change listener is incomplete. | Add `'preparacion'` to the array |
| note | — | Commands not run: `pnpm astro check` and `git status` | The available tools do not include `bash` to execute shell commands. Only bash management tools (`bash_kill`, `bash_status`, `bash_watch`, `bash_write`) are present. These commands should be run manually or via CI before merging. | Run `pnpm astro check` and `git status` manually |

## Protocol Issues
- No builder report was provided — this is a validation-only task, not a builder-driven review, so this is expected.
- Shell commands could not be executed from this environment (no `bash` tool).

## Acceptance Criteria Review

### Preparación tab button exists with proper ARIA attributes
- [x] Verified: Line 986-988 — `<button role="tab" id="tab-preparacion" class="tab-btn ..." aria-selected="false" aria-controls="panel-preparacion" data-tab="preparacion">Preparación</button>` — has `role="tab"`, `aria-selected`, `aria-controls`, `data-tab`. Correct.

### Preparación panel has ternary structure (isEditMode ? InstructionsEditor : ...)
- [x] Verified: Lines 1337-1362:
  1. `isEditMode ? <InstructionsEditor />` (line 1339)
  2. `: instructions ? <RecipeInstructions />` (line 1346)
  3. `: <div>...empty state...</div>` (line 1352)
  All three branches present.

### FinancialSummary has `py-6 sm:py-8`
- [x] Verified: Line 944 — `<div class="py-6 sm:py-8">` wraps the FinancialSummary component. Correct.

### tabIds array includes 'preparacion'
- [x] Verified: Line 1520 — `const tabIds = ['ingredientes', 'costos-fijos', 'presentaciones', 'preparacion'];` — 'preparacion' is the last entry. Correct.

### InstructionsEditor is imported
- [x] Verified: Line 25 — `import InstructionsEditor from '../../components/InstructionsEditor.astro';`

### RecipeInstructions was removed from panel-ingredientes (not duplicated)
- [x] Verified: The ingredientes panel (lines 993-1182) contains only the ingredients list/edit UI. `RecipeInstructions` appears only once in the file, at line 1346 in the preparación panel. No duplication.

## Verdict
**accept** — The four structural criteria pass. Two should-fix issues are present but non-blocking for basic functionality.

## Rework Task Hints
- Fix 1: change `Hacé` → `Haz` on line 1358.
- Fix 2: add `'preparacion'` to the hash check array on line 1543.
- Run `pnpm astro check` and check `git status` before merging.
