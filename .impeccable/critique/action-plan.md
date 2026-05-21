# Action Plan: Landing Page Critique (26/40)

**Target:** `src/pages/index.astro` (landing page)  
**Date:** 2026-05-19  
**Scope:** All P0-P4 + persona fixes

---

## 1. `impeccable polish src/components/landing/HeroSection.astro`

**P0 — Gradient text (absolute ban violation)**  
**P1 — Mobile CTA placement (Casey)**

| Issue         | Detail                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Gradient text | `<span class="bg-linear-to-r from-accent-500 to-accent-600 bg-clip-text text-transparent">de tus recetas</span>` at line 20 |
| Fix           | Remove gradient text entirely. Use `<mark>` with accent-100 background, or solid `text-accent-600`                          |
| Mobile CTA    | Button only in desktop nav (top-right), unreachable by thumb                                                                |
| Fix           | Add a sticky bottom CTA or inline CTA visible on mobile viewports                                                           |

---

## 2. `impeccable polish src/components/landing/CTASection.astro`

**P1 — CTA button invisible on gradient background**

| Issue         | Detail                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Zero contrast | Button uses `bg-accent-600`, section wrapper uses `from-accent-600 to-accent-800` — identical color at origin |
| Impact        | Highest-conversion moment on page has invisible primary action                                                |
| Fix           | Change button to `bg-white text-accent-700` (invert), or lighten section gradient start to `accent-500`       |

---

## 3. `impeccable polish src/layouts/LandingLayout.astro`

**P3 — Bounce/elastic easing (4 instances)**

| Issue         | Detail                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------ |
| Bounce easing | `cubic-bezier(0.34, 1.56, 0.64, 1)` at lines 115, 135, 154, 174                            |
| Violation     | Second control point (1.56) overshoots; violates motion law: "no bounce, no elastic"       |
| Fix           | Replace all 4 with `cubic-bezier(0.23, 1, 0.32, 1)` (project's own `--ease-out`)           |
| Affected      | `.card-hover`, `.pricing-card-hover`, `.reveal-item`, and `cubic-bezier` in interpolations |

---

## 4. `impeccable craft landing data demo`

**P2 — Zero numeric data on costing tool's landing**

| Issue     | Detail                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Brand gap | "Precise" scores 2/10 on landing; design principle "numbers own the page" completely absent                                          |
| Impact    | Visitors scanning for "costear recetas" find no cost data, assume generic recipe app                                                 |
| Fix       | Add concrete cost example with JetBrains Mono numerals: e.g., `$2.40` → `$4.80` → `$8.50` as 3-column stat block in hero or features |
| Persona   | Cristina (baker) needs to see a cost calculation in first viewport or bounces in 2 seconds                                           |

---

## 5. `impeccable enhance src/components/landing/LandingNavbar.astro`

**P4 — No scroll-spy / active-section indicator**

| Issue      | Detail                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Missing UX | Nav anchor links (`#features`, `#how-it-works`, `#pricing`) never show active state                                |
| Impact     | Visibility of System Status scored 2/4; users can't tell which section they're viewing                             |
| Fix        | Add IntersectionObserver that adds `text-accent-600` to current section's nav link when ≥50% in view. ~20 lines JS |

---

## 6. `impeccable harden src/pages/index.astro`

**Persona fixes — heading hierarchy, skip link**

| Issue               | Detail                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Broken heading tree | `h1 → h2 → h4` (footer column headings use `<h4>` with no parent `<h3>`) — fails a11y audit                                             |
| Skip link           | `<main id="main-content">` may need `tabindex="-1"` to receive programmatic focus                                                       |
| Fix                 | Change footer `<h4>` to `<h3>`. Add `tabindex="-1"` to `<main>`. Optionally remove redundant footer theme toggle (3 toggles is clutter) |

---

## 7. `impeccable optimize src/components/landing/FeaturesSection.astro`

**Persona fix — lazy loading for mobile users (Casey)**

| Issue           | Detail                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Blocking images | 3 full-width screenshots with no `loading="lazy"`, no `decoding="async"`                                      |
| Impact          | On 3G, images block Critical Path; violates Casey persona expectation                                         |
| Fix             | Add `loading="lazy" decoding="async"` to all `<img>` tags. Add descriptive `alt` text beyond "Captura de ..." |

---

## Final: `impeccable polish`

Full quality pass across all changes: verify consistency, check dark mode, confirm mobile behavior, run `pnpm astro check` and `pnpm eslint .`.

---

## Expected Outcome

| Metric                    | Current                          | Target              |
| ------------------------- | -------------------------------- | ------------------- |
| Nielsen score             | 26/40                            | 30+/40              |
| AI slop tells             | 2 (gradient text, bounce easing) | 0                   |
| Brand "precise" score     | 2/10                             | 6+/10               |
| Anti-reference violations | 1 (SaaS skeleton structure)      | 0 visual violations |
