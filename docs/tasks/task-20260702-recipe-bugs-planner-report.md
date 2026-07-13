# Planner Report: task-20260702-recipe-bugs-planner

## Context Received
- Spec: Inline user request (6 bugs on recipe page)
- State: none
- Memory: `docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md` (not relevant to these fixes)
- Explore: `docs/analysis/analysis-20260702-recipe-page-bugs-explore.md`

## Decisions

| # | Decision | Source Artifact |
|---|----------|-----------------|
| 1 | **Combine Bugs 2+3 into same task** — both modify row index assumptions in `buildFinancialRows` and `buildFinancialEditFields`. Bug 2 removes variable-length per-fixed-cost rows, which makes row indices stable. Bug 3 fixes the margin rowIndex. They share the same file and must be sequenced correctly. | Explore report §6 (lines 762-835) |
| 2 | **Include Bug 4 in Task 1** — moving FinancialSummary above tabs is a simple cut-paste in the same file, no reason for a separate task | Explore report §8 (lines 1345-1354) |
| 3 | **Include Bug 5 in Task 1** — tab persistence via sessionStorage is a client-side script change in the same file. The sessionStorage key is pathname-scoped to avoid cross-recipe leakage | Explore report §9 (lines 1459-1542) |
| 4 | **Bug 1 as Task 2** — separate file (`RecipeFixedCosts.astro`), independent. Remove `isEditing &&` guards around button and dialog | Source code read §10 (lines 30, 67) |
| 5 | **Bug 6 as Task 3** — separate file (`RecipeActionsMenu.astro`), one-line `data-astro-reload` addition on the edit link | Source code read §20 (line 79) |
| 6 | **All tasks parallel-safe** — 3 different files, no overlap | Source structure |
| 7 | **No human approval needed** — no schema changes, no auth/billing changes, no new POST handlers, no destructive data operations | Task file constraints |
| 8 | **Security review**: None of the changes touch auth, CSRF, ownerId scoping, Prisma queries, or POST handlers. No new attack surface introduced. The sessionStorage tab persistence stores a pathname+tabId string (no sensitive data). `data-astro-reload` is a navigation directive with no security impact. | Security skill passive review |

## Files Produced
- `docs/plans/plan-20260702-recipe-bugs.md`

## Blockers
- none

## Skills Used
Selected:
- `ponytail` — kept all changes to minimal diffs (shortest path per bug), combined [recipe].astro changes into one task, avoided unnecessary refactoring
- `security-best-practices` — passive review confirmed no auth/CSRF/ownerId impact from any bug fix

Discarded:
- `ui-ux-pro-max` — no design work needed
- `stripe-best-practices` — no billing changes
- `prisma-client-api` — no new Prisma queries
- `design-system-verify` — no UI token changes

Added During Execution:
- none

## Verdict
ready
