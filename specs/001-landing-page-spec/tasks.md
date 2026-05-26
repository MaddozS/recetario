# Tasks: KitchCalc Landing Page — Audit & Improve

**Input**: Design documents from `specs/001-landing-page-spec/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: No test infrastructure exists. Validation is manual (Lighthouse, WCAG contrast checker, visual review).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/components/landing/`, `src/layouts/`, `src/styles/` at repository root
- No backend changes — landing page only

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify development environment and establish baseline

- [ ] T001 Verify project builds and runs with `pnpm install && pnpm dev`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting improvements that MUST be complete before user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Fix `text-subtle-foreground` contrast in `src/styles/global.css` — darken light mode value from `#94a3b8` to `#78716c` (target WCAG AA 4.5:1+), verify dark mode oklch counterpart
- [ ] T003 [P] Subset Google Fonts weights in `src/layouts/LandingLayout.astro` — change Outfit to `wght@400;600;700`, JetBrains Mono to `wght@400;500`
- [ ] T004 [P] Remove unnecessary `will-change-transform` from Hero glow div in `src/components/landing/HeroSection.astro`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Visitante descubre el software (Priority: P1) 🎯 MVP

**Goal**: Hero section improvements — full responsive coverage, reduced-motion compliance, performance

**Independent Test**: Open landing page at 320px, 768px, 1440px, 1920px widths — Hero layout, font sizes, and spacing must be correct at each breakpoint without overflow. Toggle dark mode — colors must use semantic tokens only.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Add `prefers-reduced-motion: reduce` guard to count-up animation in `src/components/landing/HeroSection.astro` — wrap `requestAnimationFrame` call with `!window.matchMedia("(prefers-reduced-motion: reduce)").matches`
- [ ] T006 [US1] Add xl/2xl responsive adjustments to `src/components/landing/HeroSection.astro` — increase `lg:gap-16` to `xl:gap-20` and `2xl:gap-24`, adjust heading `clamp()` max value for >1920px

**Checkpoint**: At this point, US1 should be fully functional and testable independently

---

## Phase 4: User Story 2 — Visitante explora funcionalidades (Priority: P1)

**Goal**: Features section improvements — fix Token Bridge violation, eliminate dual-image payload, prevent CLS

**Independent Test**: Open landing page, navigate to Features section. Each feature must display with correct image (light/dark per theme). Click image — lightbox opens with `bg-backdrop/50` backdrop. Verify only ONE image request per feature in DevTools Network tab.

### Implementation for User Story 2

- [ ] T007 [P] [US2] Fix lightbox backdrop color in `src/components/landing/FeaturesSection.astro` — replace `backdrop:bg-black/70` with `backdrop:bg-backdrop/50`; add explicit `@media (prefers-reduced-motion: reduce)` guard on `lightboxIn` and `backdropIn` keyframe animations (override to `animation: none`)
- [ ] T008 [P] [US2] Refactor dual `<img>` to `<picture>` element in `src/components/landing/FeaturesSection.astro` — use `<source media="(prefers-color-scheme: dark)">` for dark images, single `<img>` for light fallback; update lightbox JS to use `matchMedia("(prefers-color-scheme: dark)")` instead of `document.documentElement.classList.contains("dark")`
- [ ] T009 [US2] Add explicit `width` and `height` attributes to feature screenshots in `src/components/landing/FeaturesSection.astro` — prevent CLS during image load

**Checkpoint**: At this point, US1 + US2 should both work independently

---

## Phase 5: User Story 3 — Visitante entiende el flujo de trabajo (Priority: P2)

**Goal**: How it works section — fix hardcoded text color

**Independent Test**: Navigate to How it works section in light and dark mode. Step number circles must show number in `text-text-on-accent` (not hardcoded white). Stat badges must use corrected `text-subtle-foreground` token.

### Implementation for User Story 3

- [ ] T010 [US3] Fix step circle `text-white` → `text-text-on-accent` in `src/components/landing/HowItWorksSection.astro`

**Checkpoint**: US3 independently testable

---

## Phase 6: User Story 4 — Visitante compara planes de precios (Priority: P2)

**Goal**: Pricing section — fix hardcoded text, responsive improvements for small and wide screens

**Independent Test**: Navigate to Pricing section. CTA buttons on Pro card must use `text-text-on-accent`. Pricing cards must not overflow viewport at 320px width. At 1920px width, cards must use adjusted padding/gap.

### Implementation for User Story 4

- [ ] T011 [P] [US4] Fix CTA button `text-white` → `text-text-on-accent` in `src/components/landing/PricingSection.astro`
- [ ] T012 [P] [US4] Fix pricing card `min-w-[280px]` → `min-w-[260px]` in `src/components/landing/PricingSection.astro` — prevent overflow at 320px viewport width
- [ ] T013 [US4] Add xl/2xl responsive adjustments to `src/components/landing/PricingSection.astro` — increase `gap-6` to `xl:gap-8`, adjust card padding with `xl:p-10`

**Checkpoint**: US4 independently testable

---

## Phase 7: User Story 5 — Visitante se registra desde la landing (Priority: P3)

**Goal**: CTA section + Navbar/Footer — fix Token Bridge violations

**Independent Test**: Navigate to CTA section and Navbar. All text/background colors must use semantic tokens. In dark mode, CTA buttons must render correctly (no hardcoded white). Toggle dark mode — no flash of wrong colors.

### Implementation for User Story 5

- [ ] T014 [P] [US5] Fix hardcoded colors in `src/components/landing/CTASection.astro` — replace `bg-white` with `bg-card`, `text-white` with `text-text-on-accent`, `border-white/30` with `border-border/30`; update dark mode `dark:bg-[radial-gradient(...)]` to derive from accent tokens
- [ ] T015 [US5] Fix hardcoded `text-accent-600` class in scroll spy JS in `src/components/landing/LandingNavbar.astro` — replace class toggle with data attribute pattern

**Checkpoint**: All user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verification, auditing, and final quality checks

- [ ] T016 [P] Verify all accent-contrast pairs in dark mode — check each accent family shade against `oklch(0.176 0.008 258)` background for WCAG AA 4.5:1 minimum
- [ ] T017 Run `pnpm build && pnpm astro check && pnpm eslint .` — zero errors required
- [ ] T018 Run Lighthouse audit — target >80 mobile, >90 desktop; verify CLS <0.1; verify contrast in both themes using axe DevTools

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel after Foundational (independent files)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **US2 (P1)**: Can start after Foundational (Phase 2) — Independent from US1
- **US3 (P2)**: Can start after Foundational (Phase 2) — Independent from US1/US2
- **US4 (P2)**: Can start after Foundational (Phase 2) — Independent from other stories
- **US5 (P3)**: Can start after Foundational (Phase 2) — Independent from other stories

### Within Each User Story

- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Phase 2 tasks (T002-T004) marked [P] can run in parallel
- All user story tasks marked [P] can run in parallel (different files, no cross-dependencies)
- US1-US5 have zero cross-file dependencies — all can be worked in parallel
- Polish tasks T016, T018 can run in parallel; T017 blocks on all implementations

---

## Parallel Example: User Story 1 + User Story 2

```bash
# Phase 2 (parallel):
Task: "Fix text-subtle-foreground contrast in src/styles/global.css"
Task: "Subset Google Fonts weights in src/layouts/LandingLayout.astro"
Task: "Remove will-change-transform from HeroSection.astro"

# Phase 3+ (parallel — US1 + US2 simultaneously):
Task: "Add reduced-motion guard to HeroSection.astro"
Task: "Fix lightbox backdrop in FeaturesSection.astro"
Task: "Refactor dual img to picture in FeaturesSection.astro"
Task: "Add img dimensions to FeaturesSection.astro"
Task: "Add xl/2xl breakpoints to HeroSection.astro"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup — `pnpm install && pnpm dev`
2. Complete Phase 2: Foundational — contrast fix + fonts + will-change
3. Complete Phase 3: User Story 1 — Hero improvements
4. **STOP and VALIDATE**: Test US1 independently — responsive breakpoints, reduced-motion, Lighthouse
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (Hero) → Test independently → Deploy/Demo (MVP!)
3. Add US2 (Features) → Test independently → Deploy/Demo
4. Add US3 (How It Works) → Test independently → Deploy/Demo
5. Add US4 (Pricing) → Test independently → Deploy/Demo
6. Add US5 (CTA) → Test independently → Deploy/Demo
7. Add Polish (Lighthouse, verification) → Final quality gate

### Parallel Team Strategy

With multiple developers:

1. Developer A: Phase 2 (foundational) + US1 (Hero)
2. Developer B: US2 (Features) + US3 (How It Works)
3. Developer C: US4 (Pricing) + US5 (CTA/Register)
4. After all complete: Developer A runs Phase 8 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **No backend changes** — only `src/components/landing/`, `src/layouts/LandingLayout.astro`, `src/styles/global.css`
- **Token Bridge Rule is NON-NEGOTIABLE** — all hardcoded colors must be replaced
