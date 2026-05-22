---
target: @src/components/PresentationCard.astro
total_score: 33
p0_count: 0
p1_count: 0
timestamp: 2026-05-20T04-24-06Z
slug: src-components-presentationcard-astro
---
## Design Critique: PresentationCard.astro (re-evaluation)

### Design Health Score

| # | Heuristic | Prev | Now | Delta | Key Change |
|---|-----------|------|-----|-------|-----------|
| 1 | Visibility of System Status | 3 | 4 | +1 | Spinner + "Guardando..." during save; error persists until dismissed |
| 2 | Match Between System and Real World | 4 | 4 | 0 | Unchanged — kitchen vocabulary, numbers front and center |
| 3 | User Control and Freedom | 3 | 4 | +1 | Esc cancels edit mode; error dismiss button replaces auto-hide |
| 4 | Consistency and Standards | 3 | 4 | +1 | Card title matches Title spec (Outfit/text-lg); labels match label token (11px/0.16em) |
| 5 | Error Prevention | 3 | 4 | +1 | Client-side validation: required name, min yield, non-negative price check before POST |
| 6 | Recognition Rather Than Recall | 3 | 3 | 0 | Unchanged |
| 7 | Flexibility and Efficiency | 2 | 3 | +1 | Esc to cancel edit; still no bulk edit or keyboard shortcut for enter-edit |
| 8 | Aesthetic and Minimalist Design | 3 | 3 | 0 | Visual hierarchy improved (sized value differentiation); same density retained |
| 9 | Error Recovery | 3 | 3 | 0 | Manual dismiss replaces auto-hide; accents fixed; still no undo-after-save |
| 10 | Help and Documentation | 1 | 1 | 0 | No tooltips; multiplier concept unexplained |
| **Total** | | **28** | **33** | **+5** | **Good** (upper band) |

### Anti-Patterns Verdict

LLM assessment: Clean. Semantic tokens throughout, monospace for data, accent sparing, no gradient text or glassmorphism. Card grid structurally identical by design (same data type), functionally justified.

Deterministic scan: 0 findings.

### Overall Impression

The component levelled up meaningfully. Typography now matches DESIGN.md specs precisely. Esc cancels edit as expected. Save shows a spinner during async. Client-side validation catches nonsense before network. The sale price at text-[20px] now dominates visually, cost and profit step back to text-lg.

Remaining gap: no inline help or tooltips explaining the multiplier, margin formula, or threshold values. That single gap keeps this from pushing past 33.

### Priority Issues

[P2] No tooltips or contextual help. Margin formula and multiplier concept unexplained.

[P3] marginPercent >= 0 else-block is dead code (Math.max clamps > 0 so >= 0 is always true when reached).

### Persona Red Flags

Alex (Power User): Esc now works. Input validation prevents round-trips. No keyboard shortcut to enter edit mode.

Jordan (First-Timer): Multiplier badge and margin labels still unexplained.

Diana (Pastry chef/owner): Accents corrected, validation catches errors early, loading state visible. Significant improvement.

### Minor Observations

- text-accent-400/80 fractional opacity may dip below 4.5:1 contrast depending on accent family.
- Esc key listener on document persists for every card instance; could benefit from disconnectedCallback cleanup.
