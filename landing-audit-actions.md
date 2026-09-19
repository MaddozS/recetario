# Landing Page Audit — Action Items

> **Histórico (pre-Nuxt).** Documento de la etapa anterior a la migración a Nuxt (Task 13b): se conserva como registro, no como guía operativa, y las rutas o comandos que cita pueden no existir. Ver `docs/README.md`.

Score: **13/20** (Acceptable)
Dimensions: A11y 2 | Perf 3 | Theming 3 | Responsive 3 | Anti-Patterns 2

---

## P1 — Before release

### 1. Pricing toggle: add ARIA roles

**Files:** `PricingSection.astro`, `pricing.astro`
**Change:** Add `role="radiogroup"` to the toggle container, `role="radio"` + `aria-checked` to each button.
**Why:** Screen readers can't identify the toggle as a mutually exclusive selector.
**Command:** `impeccable harden`

### 2. "Conocer más" touch target: bump to 44px

**File:** `HeroSection.astro:62`
**Change:** `py-1` → `min-h-11 inline-flex items-center`
**Why:** 22px target fails WCAG 2.5.5. Untappable on mobile.
**Command:** `impeccable clarify`

### 3. Decorative icons: add aria-hidden

**File:** `FeaturesSection.astro:31`
**Change:** `<Icon aria-hidden="true" ...>`
**Why:** Screen readers announce decorative SVG content.
**Command:** `impeccable harden`

### 4. Desktop nav links: add focus indicators

**File:** `LandingNavbar.astro:46-59`
**Change:** Add `focus-visible:ring-2 focus-visible:ring-accent-500 rounded` to each `<a>`.
**Why:** Keyboard users can't see which link is focused.
**Command:** `impeccable harden`

---

## P2 — Next pass

### 5. Hero-metric cards: replace pattern

**File:** `HeroSection.astro:106-148`
**Change:** Replace the 3-card metric flow (Costo base → Margen → Precio venta) with a single computation demo, interactive snippet, or data visualization.
**Why:** Hero-metric template is a banned anti-pattern. Reads as AI-generated SaaS.
**Command:** `impeccable quieter`

### 6. Features section: remove icon + heading template

**File:** `FeaturesSection.astro:29-31`
**Change:** Let the feature screenshots carry the visual weight instead of the icon-with-background pattern.
**Why:** "Large rounded-corner icons above every heading" is a brand register ban.
**Command:** `impeccable distill`

### 7. Plan CTA buttons: bump to 44px

**File:** `PricingSection.astro:160`
**Change:** Current `py-3` + 14px text ≈ 38px. Use `min-h-11`.
**Why:** Fails WCAG 2.5.5 target size.
**Command:** `impeccable harden`

### 8. Pricing toggle buttons: bump to 44px

**File:** `PricingSection.astro:17-27`
**Change:** Current `py-2.5` + 14px text ≈ 40px. Use `min-h-11`.
**Why:** Fails WCAG 2.5.5 target size.
**Command:** `impeccable harden`

### 9. Reveal items: single IntersectionObserver

**File:** `LandingLayout.astro` client script
**Change:** Refactor `setupRevealItems()` to use a single shared observer instead of one per `[data-reveal-parent]`.
**Why:** Performance micro-optimization. Current pattern creates n observers.
**Command:** `impeccable polish`

---

## P3 — Polish

### 10. CTA section: semantic text-on-accent token

**File:** `CTASection.astro:10-20`
**Change:** Add a `text-on-accent` semantic token instead of `text-white` in markup. Low priority.
**Command:** `impeccable polish`

---

## Running order

```
impeccable harden    # P1: ARIA + focus indicators + touch targets
impeccable quieter   # P2: hero-metric replacement
impeccable distill   # P2: features icon pattern removal
impeccable harden    # P2: remaining touch targets
impeccable polish    # P2/P3: observer refactor + token cleanup

impeccable audit     # re-run after fixes
```
