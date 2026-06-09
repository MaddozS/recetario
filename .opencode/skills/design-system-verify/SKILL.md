---
name: design-system-verify
description: "Verifies Recetario frontend code complies with the design system: no hardcoded colors, no manual overrides on design-system components, all icons in lucide whitelist, all Prisma queries include ownerId. Use before completing UI changes or when reviewing UI PRs."
trigger: manual
---

# Design System Verify

Automated design-token leak detection for Recetario's Astro + Tailwind codebase. Use as a pre-completion checklist (implementer) or review checklist (reviewer).

## When to use

- Implementer: before declaring UI changes complete
- Reviewer: as part of pattern compliance checks for UI changes
- Periodic audit: after adopting new design system primitives or bulk migrations

## Checks

### 1. Hardcoded Colors

**Command:**
```bash
grep -rnE 'bg-(red|blue|green|slate|gray|zinc|neutral|stone|orange|amber|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]' src/ --include='*.astro'
```

**Expected:** 0 matches. All colors must use semantic tokens (`bg-card`, `text-foreground`, `border-border`, `accent-*`, `muted-*`, etc.).

**Also check JSX/TSX files:**
```bash
grep -rnE '(bg|text|border|ring|outline|shadow|fill|stroke)-(red|blue|green|slate|gray|zinc|neutral)' src/ --include='*.tsx'
```

### 2. Manual Overrides on Design-System Components

**Components to check:** `Button`, `Input`, `Dialog`, `Card`, `Badge`

**Method:** Read each call site and flag any `class` or `className` prop that overrides color, shape, or spacing in ways the component's variant system should handle.

**Red flags (manual overrides that should be variants):**
- `class="bg-red-500 text-white px-6"` on a Button → should use `variant="danger"`
- `class="min-h-11 min-w-11 rounded-full"` on a button → use Button `iconOnly` variant
- `class="border-2 border-emerald-500"` on a Card → should use a variant or semantic token

**Not red flags (legitimate overrides):**
- `class="mt-4"` (positioning/spacing in parent layout)
- `class="hidden md:block"` (responsive visibility)
- `data-*` attributes (helper selectors for JS)

### 3. Icon Whitelist

**Command:**
```bash
grep -rn 'lucide:' src/ --include='*.astro' | sed 's/.*lucide:\([^"'"'"'`[:space:]]*\).*/\1/' | sort -u
```

**Then:** Cross-reference each icon name against `astro.config.mjs` → `integrations[].include.lucide` array (lines 28-90). Any icon NOT in the array will fail at build time with: `Unable to locate "lucide:<name>" icon!`

### 4. Prisma `ownerId` in Queries (Security)

**Command:**
```bash
grep -rnE 'db\.\w+\.(findMany|findFirst|findUnique|update|delete|upsert|count)\(' src/ --include='*.ts' --include='*.tsx' --include='*.astro' | grep -v 'node_modules'
```

**Check:** Each query result should be traced back to verify `where: { ownerId` is present. This is a security invariant — multi-tenant queries without `ownerId` leak data across users.

**Exemptions:** Seed/bootstrap flows are the only exception (documented in AGENTS.md).

## Output Format

```
## Design System Verification

### 1. Hardcoded Colors: PASS / FAIL
[If FAIL: file:line references for each violation]

### 2. Manual Overrides: PASS / FAIL
[If FAIL: component + override + suggested variant]

### 3. Icon Whitelist: PASS / FAIL
[If FAIL: icon name + whether it needs whitelist addition or should be replaced]

### 4. Prisma ownerId: PASS / FAIL
[If FAIL: query location + missing ownerId]
```

## Example Usage

```
# From implementer (after UI changes):
grep -rnE 'bg-(red|blue|green|slate|gray)' src/ --include='*.astro'
# 0 matches → PASS

grep -rn 'lucide:' src/ --include='*.astro'
# cross-reference against astro.config.mjs
# pencil ✓ (L:73), trash-2 ✓ (L:84) → PASS
```

## Project Context

- **Astro 6** SSR with Tailwind CSS semantic tokens
- Design system components: `src/components/ui/` barrel (Button, Input, Dialog, Card, Badge, Icon, FeedbackAlert, SectionHeading, FinancialSummary)
- Semantic tokens defined in `DESIGN.md` and Tailwind config
- astro-icon whitelist: `astro.config.mjs` lines 28-90
- Prisma multi-tenant: all queries require `ownerId` (AGENTS.md invariant)
