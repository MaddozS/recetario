# Quickstart: Landing Page Improvements

## Prerequisites

```bash
pnpm install        # asegurar dependencias
pnpm dev            # servidor local
```

## Work Order (recommended sequence)

### 1. Fix Token Bridge violations (NON-NEGOTIABLE)

**Files to modify**:

| File | Changes |
|---|---|
| `src/components/landing/FeaturesSection.astro` | Replace `backdrop:bg-black/70` → `backdrop:bg-backdrop/50` |
| `src/components/landing/CTASection.astro` | Replace `bg-white` → `bg-card`, `text-white` → `text-text-on-accent`, `border-white/30` → `border-border/30` |
| `src/components/landing/HowItWorksSection.astro` | Replace step circle `text-white` → `text-text-on-accent` |
| `src/components/landing/PricingSection.astro` | Replace CTA button `text-white` → `text-text-on-accent` |

**Verify**: `pnpm dev` — visual check no regressions in light + dark mode.

### 2. Fix contrast — `text-subtle-foreground`

**File**: `src/styles/global.css`
- Light mode: darken `#94a3b8` → `#78716c` (target ratio ~5.5:1)
- Dark mode: verify `oklch` value maintains 4.5:1 minimum against dark bg

**Verify**: Use browser DevTools → inspect computed styles → contrast ratio checker.

### 3. Fix dual images — FeaturesSection

**File**: `src/components/landing/FeaturesSection.astro`

Replace dual `<img>` pattern:
```astro
<!-- BEFORE: two img tags, one hidden -->
<img src={lightSrc} class="dark:hidden" ... />
<img src={darkSrc} class="hidden dark:block" ... />

<!-- AFTER: single img with data attrs + MutationObserver -->
<img
  src={lightSrc}
  data-light-src={lightSrc}
  data-dark-src={darkSrc}
  class="... theme-aware-img"   ← add .theme-aware-img class
  width="800" height="600"
/>
```

Also add JS (`setupFeatureThemeImages()`) que usa `MutationObserver` sobre `document.documentElement` para detectar cambios en la clase `.dark` y actualizar `img.src`. NO usar `<picture>` con `prefers-color-scheme` porque el app usa toggle manual, no OS-level. Actualizar lightbox JS para usar `document.documentElement.classList.contains("dark")` en vez de `matchMedia("prefers-color-scheme")`.

### 4. Add img dimensions — FeaturesSection

Add `width` and `height` attributes to feature screenshots to prevent CLS.

### 5. Add xl/2xl breakpoints

**Files**: HeroSection, PricingSection, LandingLayout

- Adjust `max-w-7xl` → `max-w-screen-xl` for very wide screens
- Add `xl:` variants for Hero grid gap and Pricing card padding
- Add `2xl:` variants for CTA font size and section padding

### 6. Fix `prefers-reduced-motion` — count-up

**File**: `src/components/landing/HeroSection.astro`

```astro
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  startCountUp();
}
```

### 7. Subset Google Fonts

**File**: `src/layouts/LandingLayout.astro`

Change font URL from loading all weights to only used weights:
- Outfit: `wght@400;600;700`
- JetBrains Mono: `wght@400;500`

### 8. Final verification

```bash
pnpm build                    # producción build
pnpm astro check              # type-check
pnpm eslint .                 # lint
```

Run Lighthouse (Chrome DevTools → Audits) — target: >80 mobile, >90 desktop.
Check contrast in both themes using axe DevTools or WCAG Contrast Checker.

## Files NOT to change

- `src/lib/db/billing.ts` — no changes to data layer
- `src/lib/plans-config.ts` — no pricing changes
- `src/lib/auth*.ts` — no auth changes
- `prisma/schema.prisma` — no schema changes
- Any files outside `src/components/landing/`, `src/layouts/LandingLayout.astro`, `src/styles/global.css`

## Rollback

```bash
git checkout -- src/components/landing/ src/layouts/LandingLayout.astro src/styles/global.css
```
