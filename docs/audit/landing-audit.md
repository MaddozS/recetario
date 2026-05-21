# Landing Page Audit

**Date**: 2026-05-21
**Scope**: `src/pages/index.astro` + 7 landing components + `LandingLayout.astro`
**Register**: Brand (marketing surface for product)

---

## Anti-Patterns Verdict

**Borderline.** Above template-average, not distinctive. Coral accent + tonal depth + staggered reveals show intent. But: no food imagery (cardinal sin for food product), hero metric card, HowItWorks icon grid. Not slop gallery, not yet distinctive enough to pass "who made this?" test.

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | A11y | 3 | WCAG AA mostly met. Mobile menu no Escape key, pricing toggle no arrow nav, `text-accent-600/80` contrast ~4:1 |
| 2 | Performance | 3 | Well-optimized. `blur-2xl` + gradient pattern on hero may jank on mid-range devices. No will-change on transforms |
| 3 | Theming | 3 | Semantic tokens used. `.dark` CSS overrides present (against DESIGN.md rule). Missing `color-scheme` on `<html>` |
| 4 | Responsive | 3 | Fluid layout, good breakpoints, 44px touch targets. Pricing scrollbar hidden (usability loss on mobile) |
| 5 | Anti-Patterns | 2 | P1: Zero food imagery on food product landing. Hero metric card (cost flow) = template pattern. HowItWorks icon grid |
| **Total** | | **14/20** | **Good** — address weak dimensions |

---

## Detail: What Could Help With The Next Pass

This section lists each finding with enough context to guide the next iteration.
Tagged **P0-P3** by severity and grouped by target command so you can run fixes
in any order.

---

### `impeccable bolder landing`

#### P1 — Zero food imagery on food product landing

| Field | Value |
|-------|-------|
| **Location** | All landing components — `HeroSection`, `FeaturesSection`, `HowItWorksSection` |
| **Category** | Anti-Pattern (Brand ban) |
| **Impact** | Brand register demands imagery when product domain is food/restaurant/cooking. Landing has zero food photos: hero shows logo, features show app screenshots, no hero photo. Reads as incomplete |
| **Standard** | Brand register: "Zero imagery on a brief that implies imagery (restaurant, food, travel, fashion) is a bug, not a design choice" |
| **Recommendation** | Hero needs a decisive food photo (ingredients, kitchen prep, finished dish). Replace logo-as-hero-image with food photography. Verify Unsplash IDs before committing |

#### P1 — Hero metric card (cost breakdown)

| Field | Value |
|-------|-------|
| **Location** | `HeroSection.astro:74-142` |
| **Category** | Anti-Pattern |
| **Impact** | SaaS template signal. Tracked-uppercase labels + mono numbers + arrow separators = hero-metric pattern. Undermines brand commitment to "not SaaS-cream generic" |
| **Recommendation** | Replace with a different affordance: inline calculation preview, before/after cost story, or a single decisive number with context. Keep the cost concept, ditch the 3-column metric card |

---

### `impeccable harden landing`

#### P2 — Missing Escape key on mobile menu

| Field | Value |
|-------|-------|
| **Location** | `LandingNavbar.astro:180-210` |
| **Category** | A11y |
| **Impact** | Mobile menu drawer traps keyboard users who expect Escape to close. WCAG 2.1.1 violation |
| **WCAG** | 2.1.1 Keyboard (Level A) |
| **Recommendation** | Add `keydown` listener for Escape key |

#### P2 — `.dark` CSS overrides in LandingLayout

| Field | Value |
|-------|-------|
| **Location** | `LandingLayout.astro:132-136`, `149-154`, `171-177`, `206-214` |
| **Category** | Theming |
| **Impact** | "Never write `.dark` CSS selector overrides — token system handles it" (DESIGN.md rule). Present in card-hover, pricing-card, hero-pattern. Breaks token abstraction; any new dark-mode value requires another `.dark` block |
| **Recommendation** | Refactor to CSS variable-driven shadows. Use `var(--tw-shadow)` or custom shadow tokens that remap in dark |

#### P2 — Pricing toggle missing arrow key navigation

| Field | Value |
|-------|-------|
| **Location** | `PricingSection.astro:89-112` + client JS |
| **Category** | A11y |
| **Impact** | `role="radiogroup"` with `role="radio"` buttons expects Left/Right arrow for selection. Only click works. WCAG 4.1.2 violation |
| **WCAG** | 4.1.2 Name, Role, Value (Level A) |
| **Recommendation** | Add `keydown` handler for ArrowLeft/ArrowRight on the radiogroup |

#### P3 — `color-scheme` not set on `<html>`

| Field | Value |
|-------|-------|
| **Location** | `LandingLayout.astro:11-17` |
| **Category** | Theming |
| **Impact** | Browser-native elements (scrollbars, form controls) won't auto-adapt in dark mode |
| **Recommendation** | Add `style="color-scheme: light dark"` on `<html>` |

---

### `impeccable layout landing`

#### P2 — HowItWorks identical icon card grid

| Field | Value |
|-------|-------|
| **Location** | `HowItWorksSection.astro:67-96` |
| **Category** | Anti-Pattern |
| **Impact** | Three identical columns with accent circle icon + h3 + p. Matches "large rounded-corner icons above every heading" brand ban |
| **Recommendation** | Differentiate steps visually: alternating layout, progressive emphasis (step 1 small → step 3 large), or remove icons entirely and use numbers only |

---

### `impeccable optimize landing`

#### P3 — `blur-2xl` on hero without `will-change`

| Field | Value |
|-------|-------|
| **Location** | `HeroSection.astro:153` |
| **Category** | Performance |
| **Impact** | `blur-2xl` (backdrop blur 48px) is GPU-intensive. Combined with gradient patterns in hero, may cause frame drops on scroll on mid-range mobile |
| **Recommendation** | Add `will-change: transform` or `contain: paint` on the blur element. Or reduce blur intensity |

---

### `impeccable adapt landing`

#### P3 — Pricing section scrollbar hidden

| Field | Value |
|-------|-------|
| **Location** | `PricingSection.astro:225-232` |
| **Category** | Responsive |
| **Impact** | `scrollbar-width: none` + `display: none` on webkit scrollbar. Users can't see scroll position or know content continues off-screen |
| **Recommendation** | Show a gradient fade indicator on edges, or use visible thin scrollbar |

---

## Positive Findings

- Semantic color tokens used consistently across all components. No hardcoded hex/oklch in templates
- IntersectionObserver for scroll reveals, properly guarded with `prefers-reduced-motion`
- 44px touch targets everywhere (`min-h-11`)
- `loading="lazy"` on all feature screenshots
- Skip link present and functional
- Accent theming via CSS vars works correctly (coral default)
- Staggered reveal delays feel intentional, not auto-generated
- CTASection uses Drenched color strategy — distinctive, commits to accent
- Binding guards (`data-bound`, `data-bounded`) prevent duplicate listeners across SPA navigations

---

## Recommended Actions (priority order)

1. **[P1]** `impeccable bolder landing` — Add food imagery, replace hero metric card
2. **[P2]** `impeccable harden landing` — Escape key, `.dark` refactor, pricing toggle a11y, color-scheme
3. **[P2]** `impeccable layout landing` — Differentiate HowItWorks step layout
4. **[P3]** `impeccable optimize landing` — will-change on blur, perf review
5. **[P3]** `impeccable adapt landing` — Pricing scrollbar visibility

Finish with `impeccable polish landing` after fixes.
