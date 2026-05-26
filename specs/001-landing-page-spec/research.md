# Research: Landing Page Audit

**Phase**: 0 — Outline & Research
**Date**: 2026-05-26
**Spec**: `spec.md`

## Method

Code review manual de los 7 componentes landing + LandingLayout + global.css. Verificación contra Constitution.md, DESIGN.md, y especificación del feature.

---

## Findings — Responsive Breakpoints (Tailwind v4)

### Current coverage

| Breakpoint | Files | Purpose |
|---|---|---|
| `sm` (640px) | Navbar, Hero, Features, HowItWorks, Pricing, CTA, Footer | Layout shifts, font sizing, spacing |
| `md` (768px) | Navbar, Hero, Features, HowItWorks, Pricing, CTA, Footer | Grid columns, section padding, mobile menu toggle |
| `lg` (1024px) | Hero, Pricing, CTA, Layout | Hero grid columns, pricing overflow, CTA font |
| `xl` (1280px) | No explicit usage | — |
| `2xl` (1536px) | No explicit usage | — |

### Issues

1. **Missing xl/2xl breakpoints**: Content capped at `max-w-7xl` (1280px) but interior grids (Hero `lg:grid-cols-[1fr_auto]`) may look stretched on >1440px. Consider `max-w-screen-xl` or adjusted padding.
2. **Pricing cards <360px**: `min-w-[280px]` + `px-4` = 296px minimum. On 320px viewports, horizontal scroll works but right padding is lost. Add `min-w-[260px]` or reduce padding at smallest breakpoints.
3. **No `@container` queries**: All responsive via media queries. Acceptable for page-level sections but sections like Pricing cards could benefit from container queries for card-level layout.

**Decision**: Add xl/2xl responsive adjustments. Fix pricing card min-width for sub-360px screens.
**Rationale**: Complete coverage across all Tailwind v4 breakpoints without introducing container queries (scope constraint).
**Alternatives**: Container queries were considered but increase complexity without proportional benefit for page-level sections.

---

## Findings — Dark/Light Theme

### Mechanism
- `LandingLayout.astro` inline script prevents FOUC (reads localStorage before paint)
- `.dark` class toggle on `<html>` drives all theme changes
- `@custom-variant dark (&:where(.dark, .dark *))` in Tailwind v4
- Accent colors remapped via `getAccentCssVars()` using `darkShadeMap`
- `color-scheme: light dark` on `<html>`

### Issues

1. **CTASection dark background**: Hardcoded `dark:bg-[radial-gradient(...)]` at component level, bypassing token system. Should derive from accent tokens.
2. **Token Bridge violations**: Multiple components use hardcoded colors (see below).
3. **Accent color shift verification**: In dark mode, accent-600 → shade-500 (e.g., coral `#ff5f6d`). Ratio against `oklch(0.176 0.008 258)` bg needs verification — coral 500 passes, indigo 500 borderline.

**Decision**: Replace all hardcoded theme-specific values with semantic tokens. Verify all accent remapped values meet WCAG AA 4.5:1.
**Rationale**: Constitution NON-NEGOTIABLE — Token Bridge Rule. No exceptions.
**Alternatives**: N/A — mandate.

---

## Findings — Contrast Issues

### High priority

| Location | Current | Ratio | Issue |
|---|---|---|---|
| `text-subtle-foreground` on `bg-background` (light) | `#94a3b8` / `#f8fafc` | ~2.6:1 | Fails WCAG AA (4.5:1). Used in HowItWorks stat badges, Pricing secondary prices, Footer bullets |
| `text-muted-foreground` on `bg-background` (light) | `#64748b` / `#f8fafc` | ~4.1:1 | Borderline WCAG AA. Used extensively for descriptive text |
| `text-muted-foreground/60` on FeaturesSection | Reduced to 60% | ~2.5:1 | Lightbox hint text, only on hover — acceptable but suboptimal |

### Medium priority

| Location | Current | Issue |
|---|---|---|
| `--tw-border-light` in dark mode | `#030712` | Near-black on dark bg — nearly invisible |
| CTA secondary button (dark mode) | `text-white` on accent gradient | White on lighter portions of gradient may be ~3.5:1 |
| HowItWorks step circle dark mode | `bg-accent-600` → shade-500, `text-white` | OK for accent-500 on dark bg |

**Decision**: Darken `text-subtle-foreground` from `#94a3b8` to meet 4.5:1 minimum or use `text-muted-foreground` for critical text. Evaluate `text-muted-foreground` increase to `#78716c` (target ~5.5:1).
**Rationale**: WCAG 2.1 AA compliance. Non-negotiable for public-facing website.
**Alternatives**: Keep current values and add a contrast toggle (rejected — overengineering for a compliance baseline).

---

## Findings — Performance Improvements

### High impact

1. **Dual images in FeaturesSection**: Each feature renders two `<img>` tags (light + dark), one hidden via `dark:hidden` / `hidden dark:block`. Both trigger network requests regardless of theme. **Fix**: Use `<picture>` with `<source media="(prefers-color-scheme: dark)">` or swap `src` via JS on theme toggle.

2. **Google Fonts payload**: Outfit (7 weights) + JetBrains Mono (5 weights) = ~300-400KB. Current `media="print" onload="this.media='all'"` loads both fully. **Fix**: Subset fonts to weights actually used (Outfit 400/600/700, JetBrains Mono 400/500). Consider `font-display: optional` for non-critical weights.

3. **No explicit img dimensions on feature screenshots**: `h-auto w-full` without `width`/`height` attributes causes CLS as images load. **Fix**: Add `width` and `height` attributes to feature screenshots.

### Medium impact

4. **`will-change-transform` on Hero glow div**: Unnecessary compositor layer for all users. **Fix**: Remove or apply only during animation via JS.

5. **Count-up animation**: Uses `requestAnimationFrame` without `prefers-reduced-motion` guard. **Fix**: Add `matchMedia` check.

6. **Inline JS in LandingLayout**: `applyTheme()`, `setupScrollReveal()`, `setupRevealItems()` run on every page load and SPA navigation. **Fix**: Move to external script or defer with `astro:page-load` only.

**Decision**: Implement all high-impact fixes. Medium-impact fixes where scope allows.
**Rationale**: Spec sets Lighthouse >80 mobile, >90 desktop, <3s 4G load. Current implementation likely fails mobile score due to dual images and CLS.
**Alternatives**: Lazy-load dark images only on theme toggle (rejected — adds JS complexity for marginal gain).

---

## Consolidated Decisions

| Decision | Rationale | Alternatives Considered |
|---|---|---|
| Replace all hardcoded colors with semantic tokens | Token Bridge Rule (NON-NEGOTIABLE) | N/A |
| Refactor dual `<img>` to `<picture>` | Reduce payload ~50%, eliminate wasted requests | JS swap on theme toggle (more complex, same result) |
| Darken `text-subtle-foreground` token | WCAG 2.1 AA compliance (4.5:1) | Keep current (fails compliance), add contrast toggle (overkill) |
| Add img dimensions to feature screenshots | Eliminate CLS, improve Lighthouse score | Aspect ratio boxes (maintenance overhead) |
| Subset Google Fonts weights | Reduce font payload ~40% | WOFF2 conversion (standard practice already in use) |
| Add xl/2xl responsive adjustments | Complete Tailwind v4 breakpoint coverage | Container queries (unnecessary for page-level sections) |
| Verify all accent-relevant contrast pairs | Prevent accessibility regressions from accent shift | No verification (risk of dark-mode inaccessibility) |
