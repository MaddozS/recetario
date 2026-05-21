---
target: landing page
total_score: 26
p0_count: 1
p1_count: 1
timestamp: 2026-05-19T21-18-31Z
slug: src-pages-index-astro
---

# Critique: KitchCalc Landing Page (`src/pages/index.astro`)

## Design Health Score

| #         | Heuristic                           | Score     | Key Issue                                                                                                            |
| --------- | ----------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status         | 2/4       | No scroll-spy or active-section indicator in nav                                                                     |
| 2         | Match Between System and Real World | 4/4       | Kitchen vocabulary, 3-step workflow mirrors prep                                                                     |
| 3         | User Control and Freedom            | 3/4       | Theme toggle reversible, mobile menu close on backdrop. Missing back-to-top affordance                               |
| 4         | Consistency and Standards           | 4/4       | Button conventions, semantic tokens, heading classes consistent across 6 components                                  |
| 5         | Error Prevention                    | 2/4       | "Sin tarjeta de credito" copy good; but CTA redirects to Google OAuth with no interstitial context for cold visitors |
| 6         | Recognition Rather Than Recall      | 3/4       | Screenshots + check/x marks. Step icons are abstract SVG paths without labels                                        |
| 7         | Flexibility and Efficiency          | 3/4       | Anchor links for section jumps; no "skip to pricing" shortcut                                                        |
| 8         | Aesthetic and Minimalist Design     | 2/4       | Clean but CTA button blends into gradient background (zero contrast), accent glow exceeds 10% budget                 |
| 9         | Error Recovery                      | 1/4       | No error states defined. Image load failures have no fallback                                                        |
| 10        | Help and Documentation              | 2/4       | Feature descriptions act as lightweight docs; no FAQ, no tooltips                                                    |
| **Total** |                                     | **26/40** | **Fair — room for meaningful improvement**                                                                           |

## Anti-Patterns Verdict

**LLM assessment: FAIL (2 violations).** The landing page has two clear absolute-ban violations: gradient text on the hero headline (`bg-clip-text text-transparent` on `HeroSection.astro:20`) and bounce/elastic easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`) used in 4 transitions in `LandingLayout.astro`. The structural template (hero → features → how-it-works → pricing → CTA) is the canonical SaaS skeleton — visually skinned differently but structurally indistinguishable from hundreds of AI-generated landing pages.

**Deterministic scan: 5 findings.** The `impeccable detect` CLI found:

- `bounce-easing` (4 instances): `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoots to 156%, an elastic/bounce curve violating the motion design law. All in `LandingLayout.astro` — card-hover, pricing-card-hover, reveal-item transitions.
- `single-font` (1 instance): Only Outfit used across the landing page. **False positive** — single sans is permitted by the product register and DESIGN.md explicitly specifies one sans + one mono (mono is for data surfaces, not marketing).

The detector caught the bounce easing (which the LLM missed) and correctly identified the single font. The LLM caught the gradient text (which the CLI didn't, as it's a regex-only --fast scan on Astro files).

**Convergence:** Detector and LLM agree on meaningful issues. The bounce easing is a genuine motion design problem; the LLM flagged proximity concerns (pricing hover, card hover) without naming the specific easing problem. The detector pinned the exact culprit.

**Browser overlays:** Not available (no browser automation in this environment).

## Overall Impression

The landing page has solid foundations — coral accent, grain texture, direct Spanish copy, clean mobile nav. But it has a critical brand gap: a costing calculator landing page with **zero numbers displayed**. The design system's first principle is "numbers own the page" — the landing page hides them behind screenshots. The single biggest opportunity is injecting concrete cost data into the visual narrative, and fixing the gradient-text violation that undermines the page's own DESIGN.md.

## What's Working

### Grain texture overlay (LandingLayout.astro:60-73)

The SVG noise at 5% opacity with `mix-blend-mode: overlay` gives the flat tonal layering a tactile, print-like quality without being decorative. At z-9999 + pointer-events: none, it doesn't interfere with interaction. This is a sophisticated, memorable detail.

### Coral as anti-reflexive accent choice

Choosing coral (warm pink-orange) breaks the predictable "food tool = green/brown/amber" category reflex. The decision makes the page visually distinct before you read a word. This is category-reflex thinking applied correctly.

### Spanish microcopy tone

"Calcula el costo real" (no softening, no hedging). "Sin tarjeta de credito. Prueba gratis." "Gestiona" (vos form) — consistently warm, direct, and unpretentious. The copy executes the "confident + warm" brand personality correctly.

## Priority Issues

### [P0] Gradient text in hero headline

**What:** `HeroSection.astro:20` — `<span class="bg-linear-to-r from-accent-500 to-accent-600 bg-clip-text text-transparent">de tus recetas</span>`. Violates the absolute ban on `background-clip: text` and DESIGN.md §6.
**Why:** Gradient text is one of the most common AI training-data tells. It undermines the page's credibility and contradicts its own design spec.
**Fix:** Make the headline solid `text-foreground`. If visual separation is needed, wrap "de tus recetas" in `<mark>` with accent-100 background, or set it to `text-accent-600` directly. Both are honest alternatives that avoid the cliche.
**Suggested command:** `impeccable polish src/components/landing/HeroSection.astro`

### [P1] CTA button invisible on its own section background

**What:** `CTASection.astro:21-23` — primary CTA uses `bg-accent-600` while the section wrapper uses `from-accent-600 to-accent-800`. Zero contrast between button fill and its background at the gradient origin.
**Why:** This is the highest-conversion moment on the page. A CTA that blends into its background is a conversion killer. Only the white text and border-radius distinguish it.
**Fix:** Change button to `bg-white text-accent-700` (invert it). A white button on a colored background is a proven conversion pattern and creates maximum contrast.
**Suggested command:** `impeccable polish src/components/landing/CTASection.astro`

### [P2] Zero numeric data on a costing product's landing

**What:** The product's reason for existing is displaying costs, margins, and quantities in JetBrains Mono. The landing page contains none of these. No sample cost breakdown, no margin walkthrough, not a single dollar sign in body text.
**Why:** The brand pillar "precise" scores 2/10 on this page. A visitor scanning for a costing calculator will find no evidence of costing capability. The screenshots imply precision; the page doesn't demonstrate it.
**Fix:** Add a short live-stat block — a 3-column cost breakdown in large mono numerals showing a concrete example: "$2.40" → "$4.80" → "$8.50" with labels "Costo / Margen 43% / Precio sugerido." Or convert one feature description to include concrete numeric outcomes.
**Suggested command:** `impeccable craft landing data demo`

### [P3] Bounce/elastic easing on card transitions

**What:** `cubic-bezier(0.34, 1.56, 0.64, 1)` used in 4 places (LandingLayout.astro:115,135,154,174) for card-hover, pricing-card-hover, and reveal-item transitions. The second control point (1.56) overshoots, creating a bounce/spring behavior.
**Why:** Violates the shared design law: "Ease out with exponential curves (ease-out-quart / quint / expo). No bounce, no elastic." Bounce easing reads as cheap — it's the CSS animation equivalent of a stock template.
**Fix:** Replace all instances with `cubic-bezier(0.23, 1, 0.32, 1)` (the project's own `--ease-out`, already defined and used elsewhere). This keeps the landing animation energy responsive without the tacky overshoot.
**Suggested command:** `impeccable polish src/layouts/LandingLayout.astro`

### [P4] No scroll-spy / active-section indicator in nav

**What:** `LandingNavbar.astro:31-42` has anchor links to `#features`, `#how-it-works`, `#pricing`, but none highlight when their target section is in view.
**Why:** Standard UX pattern on long-scroll pages. Its absence feels like a bug. Users can't tell which section they're viewing without reading the content. This is what dropped Visibility of System Status to 2/4.
**Fix:** Add IntersectionObserver that applies `text-accent-600` to the current section's nav link when ≥50% in view. ~20 lines of JS.
**Suggested command:** `impeccable enhance src/components/landing/LandingNavbar.astro`

## Persona Red Flags

### Jordan (Confused First-Timer)

- **Abrupt OAuth redirect.** Clicking "Comenzar gratis" immediately redirects to Google OAuth with no interstitial page explaining what happens next, what permissions are requested, or what they'll see after signing in. For a cold visitor who's never used OAuth with this tool, this is jarring and erodes trust. High abandonment risk at the auth gate.
- **No contextual help anywhere.** No tooltip, no "what's this?" on pricing features, no FAQ link. If Jordan doesn't understand "costeo basico con margenes," there's no path to learn. Abandonment at the pricing comparison step is likely.

### Riley (Deliberate Stress Tester)

- **No error states at all.** What happens if the Google Fonts CDN fails? No fallback. What if a screenshot image 404s? No alt fallback (`alt={`Captura de ${f.title}`}` is not descriptive — a screen reader would hear "Captura de Costeo con margenes" which is meaningless without the image). What if the OAuth redirect fails? No error page, no retry affordance.
- **Landing heading hierarchy skips levels.** Footer uses `<h4>` for column headings but they live under no `<h3>`. The heading tree is `h1 → h2 → h4`. This breaks screen reader document outline and would fail an accessibility audit.

### Casey (Distracted Mobile User)

- **Nav CTA at top-right only.** The "Comenzar gratis" button is in the desktop navbar, unreachable by thumb for mobile users. The mobile menu has the CTA inside the slide-out panel, but the initial visibility is zero — Casey has to open the hamburger menu first. A floating bottom CTA or a hero-sticky button would serve mobile users better.
- **Image-heavy sections on slow connections.** 3 full-width screenshots in FeaturesSection with no lazy loading attribute, no `loading="lazy"`, no `decoding="async"`. On 3G, these block the Critical Path. The grain SVG is present in every HTML response — tiny, but avoidable.

### Project-Specific: Cristina (Small-Batch Baker)

- **Profile:** Runs a home bakery in Buenos Aires. Uses smartphone one-handed while prepping dough. Needs clear, fast cost comparisons. Has zero tolerance for decorative flair that slows her down.
- **Landing page is invisible to her.** She arrives through Google "costear recetas" → lands on / → sees no numbers → assumes it's a generic recipe app → bounces. The page must show a cost calculation within the first viewport or she's gone in 2 seconds.
- **No mobile-optimized "try it" path.** The hero CTA opens Google OAuth. Cristina wants to see the tool work before committing anything — a sandbox or animated demo inline on the page would convert her. The current path is trust-first, not evidence-first.

## Minor Observations

- **3 theme toggles** (navbar, mobile menu, footer) is at least one too many. Footer toggle is clutter.
- **Image alts are technical but unhelpful.** "Captura de Costeo con margenes" doesn't describe what the screenshot shows.
- **Skip link may not work.** `<main id="main-content">` likely needs `tabindex="-1"` to receive programmatic focus in some browsers.
- **Footer heading hierarchy broken.** `<h4>` used as column headings with no parent `<h3>`.
- **No `loading="lazy"` or `decoding="async"`** on any landing page image — all block rendering.

## Questions to Consider

1. **If a visitor saw this landing page without screenshots (images turned off), would they know it's a costing tool?** Right now, no — the copy describes features but never demonstrates them. The screenshots carry all the product-specific evidence.

2. **What would the page look like if "numbers own the page" was taken literally on the landing?** Imagine the hero replaced with a single, large cost calculation in JetBrains Mono at 96px. Imagine margin percentages as the primary visual element, not a backdrop to text. The current hero hides the product's core capability behind a headline and a CTA.

3. **Does the section structure need to be the SaaS template?** Hero → Features → HowItWorks → Pricing → CTA is the most common landing page skeleton on the internet. The visual skin is distinctive (coral, grain, Outfit), but the bones are generic. Is there a version where cost calculations ARE the navigation? Where sections are ingredient → recipe → margin, mirroring the app's actual workflow?
