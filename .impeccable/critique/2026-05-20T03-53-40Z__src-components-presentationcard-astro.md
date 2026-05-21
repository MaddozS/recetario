---
target: @src/components/PresentationCard.astro
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-05-20T03-53-40Z
slug: src-components-presentationcard-astro
---
## Design Critique: PresentationCard.astro

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Save/delete show disabled state, but no spinner or "Guardando..." text during async operations |
| 2 | Match Between System and Real World | 4 | Kitchen-domain vocabulary in Spanish. Numbers are front and center. |
| 3 | User Control and Freedom | 3 | Cancel edit reverts values; delete has confirmation. No undo after save, no Esc to exit edit. |
| 4 | Consistency and Standards | 3 | Follows project design system well. Font sizes deviate from DESIGN.md spec (title, labels). |
| 5 | Error Prevention | 3 | Delete confirmation present. No client-side validation; server-only catches bad values. |
| 6 | Recognition Rather Than Recall | 3 | Icons have aria-labels, titles, and hints. "Sugerido:" price contextualizes the input. |
| 7 | Flexibility and Efficiency | 2 | Inline edit + autofocus is efficient. No keyboard shortcuts, no bulk edit across presentations. |
| 8 | Aesthetic and Minimalist Design | 3 | Every element serves a purpose. Content density is high (5 visual sections per card). |
| 9 | Error Recovery | 3 | Inline error messages in Spanish. But auto-hide at 6s, missing accents, and no retry hint. |
| 10 | Help and Documentation | 1 | No tooltips, no contextual help. Multiplier concept and margin calculation unexplained. |
| **Total** | | **28/40** | **Good** |

### Anti-Patterns Verdict

**LLM assessment**: The component largely passes the AI slop test. It follows the project's DESIGN.md closely: semantic tokens throughout, monospace for data, accent used sparingly on the sale price area and save button. No gradient text, no glassmorphism, no side-stripe borders.

The one cross-register concern: all presentation cards share identical structure in a `grid grid-cols-2`, which brushes against the "identical card grids" absolute ban. However, these aren't decorative marketing cards; they display the same data type consistently. The sameness is functional, not lazy. Low concern.

**Deterministic scan**: Clean — 0 findings.

### Overall Impression

The component is solid: clean data display, sensible progressive disclosure (edit button reveals editing controls, save bar appears below, delete has confirmation dialog), Spanish-first copy that speaks the user's language, and good use of the semantic token system. The core interaction (edit name, adjust yield, set price, see margin recalculate live) is intuitive.

The single biggest opportunity: the card doesn't visually distinguish _which number matters most_. Cost, price, and profit all share the same font size and weight. The price should dominate; everything else should step back. That one decision would transform scanability.

### What's Working

1. **Progressive disclosure is well judged.** Read mode shows exactly one action (pencil edit). Edit mode reveals delete, save bar, and editable fields. Delete is gated behind a confirmation dialog. Nothing is more complex than it needs to be at any moment.

2. **Spanish-first microcopy that fits the kitchen domain.** "Rinde," "piezas," "Costo unitario," "Sugerido" — all natural vocabulary for a food entrepreneur. The margin labels (Saludable/Medio/Bajo/Negativo) provide instant, actionable feedback.

3. **Live recalculation is the right interaction model.** Editing yield or price instantly updates unit cost, recommended price, profit, and margin bar. No "Calculate" button, no delay. This respects the user's time and makes cost exploration feel immediate.

### Priority Issues

[P1] Typography doesn't match DESIGN.md spec. Card title uses system font at text-xl instead of Outfit at 1.125rem (Title spec). Labels use text-[10px] instead of 11px.

[P1] No client-side input validation. Empty name, negative price, zero yield pass through to server. Errors only surface after a round-trip.

[P2] Equal visual weight across financial values. Unit cost, sale price, and profit all use text-[20px] with no differentiation.

[P2] Missing loading indicator during save. Button shows disabled+faded but no spinner or "Guardando..." text.

[P2] No Esc to cancel edit mode. Power users expect Escape to back out of editing.

[P2] Tab trap in edit mode: tabbing past Save lands on invisible dialog buttons inside the closed delete modal.

[P3] Error messages lack Spanish accents ("sesion" instead of "sesión", "expiro" instead of "expiró", "pagina" instead of "página") and auto-hide at 6s.

[P3] Margin bar dead code: marginPercent clamped to Math.max(marginPercent, 0), so "Margen negativo" label path is unreachable.

[P3] @ts-nocheck suppresses all TS types in the 450-line class.

### Persona Red Flags

Alex (Power User): No Esc to cancel, tab traps on hidden dialog buttons, no keyboard shortcut for edit mode.

Jordan (First-Timer): "Con x{multiplier}" badge unexplained, no tooltip for margin formula, pencil/X icon toggle may confuse on first encounter.

Diana (Pastry chef/owner): Accent errors feel sloppy for native Spanish speaker. No client-side validation compounds frustration across multiple presentations.

### Minor Observations

- hover:border-border on line 38 is a no-op (same as default border)
- bg-accent-50/50 fractional opacity on sale price section
- text-accent-400/80 could fail contrast minimums depending on accent family
