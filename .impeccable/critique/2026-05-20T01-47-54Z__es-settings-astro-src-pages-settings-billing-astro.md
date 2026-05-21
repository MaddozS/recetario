---
target: authenticated pages
total_score: 22
p0_count: 1
p1_count: 1
timestamp: 2026-05-20T01-47-54Z
slug: es-settings-astro-src-pages-settings-billing-astro
---

# KitchCalc Critique — Authenticated Pages

## Design Health Score

| #         | Heuristic                           | Score     | Key Issue                                                                           |
| --------- | ----------------------------------- | --------- | ----------------------------------------------------------------------------------- |
| 1         | Visibility of system status         | 2/4       | `alert()` for errors, no inline loading spinners during JS updates                  |
| 2         | Match between system and real world | 3/4       | Kitchen vocabulary fits. "Mezclas" vs "Batches" terminology drift across pages      |
| 3         | User control and freedom            | 2/4       | No undo, no unsaved-changes warning, form data lost on accidental nav               |
| 4         | Consistency and standards           | 2/4       | `Card` UI component defined but unused. Form label style diverges between pages     |
| 5         | Error prevention                    | 3/4       | Ingredient delete blocked when in use, delete confirmations present                 |
| 6         | Recognition rather than recall      | 3/4       | Standard Lucide icons, labeled actions. Multiplier +/- lacks tooltips               |
| 7         | Flexibility and efficiency of use   | 2/4       | No keyboard shortcuts outside cooking mode, no bulk operations, tables not sortable |
| 8         | Aesthetic and minimalist design     | 2/4       | Clean tonal layering. Solid-green margin cards misrepresent data as "success state" |
| 9         | Help users recover from errors      | 2/4       | Error messages specific but lack recovery actions                                   |
| 10        | Help and documentation              | 1/4       | Zero in-app help, no onboarding, cost concepts unexplained                          |
| **Total** |                                     | **22/40** | **Acceptable — significant UX gaps**                                                |

## Anti-Patterns Verdict

**FAIL** — two independent assessments converge.

**LLM assessment**: The `MetricCard` component is the design system's own forbidden "hero-metric template" deployed system-wide. Accent color (`bg-accent-50` backgrounds) appears on ~30% of screen surfaces instead of the prescribed ≤10%.

**Detector scan**: 4 actionable findings. `bg-black` in `RecipeInstructions.astro:166`, an em dash in `produccion.astro:357`, inline hex fallbacks in `ingredients.astro:1089`, and `single-font` warning in `Layout.astro:45`.

## Cognitive Load

1 failure / 8 checks — Low. Recipe edit mode on mobile packs 32+ form controls on screen with 8 ingredients.

## Priority Issues

### P0 — Design system self-contradiction

`DESIGN.md` bans "hero-metric templates" but `MetricCard` is exactly that. Accent appears on ~30% of surfaces. Either revise DESIGN.md or redesign MetricCard.

### P1 — `alert()` for error handling

`PresentationCard.astro:390` and `settings.astro:800` use browser `alert()`. Replace with inline error state or toast.

### P2 — Mobile horizontal-scroll metric cards hide critical data

4th card off-screen by default. Consolidate or show 2x2 grid on mobile.

### P2 — `Card` UI component defined but unused

Every page hardcodes card classes inline. Adopt or remove.

### P3 — No loading states for JS updates

Category filtering and production recalculation produce instant DOM mutations.

## Persona Red Flags

- **Alex**: No keyboard shortcuts, no bulk operations, tables not sortable
- **Jordan**: Zero onboarding, cost concepts unexplained, multiplier invisible
- **Maria**: Horizontal scroll cards undiscoverable, edit mode overwhelming on mobile
