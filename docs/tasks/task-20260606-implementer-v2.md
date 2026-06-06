# Task: Mejorar visibilidad del breadcrumb en Header
Agent: implementer
Date: 2026-06-06
Plan: docs/plans/plan-20260606-breadcrumb-global-header.md

## Goal
Mejorar la visibilidad del breadcrumb con tres cambios visuales: divider después del logo, indicador iconográfico de breadcrumb, y chevrons en color accent.

## Context
El breadcrumb global ya funciona pero no se distingue bien visualmente. El usuario quiere:
1. Un divider vertical (línea) después del logo/título para separar branding del breadcrumb
2. Un pequeño icono indicador antes del trail del breadcrumb (como `lucide:chevrons-right` o similar)
3. Los chevrons separadores (`>`) entre items deben usar el color accent del usuario (`text-accent-600`)

## Files Involved
- `src/components/Header.astro`: modify — add divider, indicator icon, accent chevrons

## Technical Steps

### 1. Add vertical divider after logo/title block (desktop only)
After the `<div>` containing "KitchCalc" / "Costeo Inteligente" (line ~56-63), and BEFORE the desktop breadcrumb nav (line ~66-82), add a vertical divider that only shows when breadcrumb is present:

```html
{showMobileBreadcrumb && (
  <div class="hidden md:block h-6 w-px bg-border" aria-hidden="true"></div>
)}
```

This creates a subtle vertical line separating the logo area from the breadcrumb area on desktop.

### 2. Add breadcrumb indicator icon
Inside the desktop breadcrumb `<nav>` (around line 67), BEFORE the `breadcrumbs.map()`, add a small indicator icon to signal this is a breadcrumb trail:

Use `lucide:chevrons-right` (double chevron) as the indicator icon — it's a common breadcrumb pattern.

```html
<nav aria-label="Breadcrumb" class="hidden md:flex items-center gap-1.5 text-sm min-w-0">
  <Icon name="lucide:chevrons-right" size={14} class="text-accent-600 shrink-0 opacity-70" />
  {breadcrumbs.map((item, i) => (
    ...
  ))}
</nav>
```

The icon should be `text-accent-600` with slight opacity reduction (`opacity-70`) so it signals "breadcrumb" without being overwhelming.

### 3. Change chevron separators to accent color
In the same desktop breadcrumb nav, change the separator chevron from `text-subtle-foreground` to `text-accent-600`:

Line ~70: Change:
```html
{i > 0 && <Icon name="lucide:chevron-right" size={14} class="text-subtle-foreground shrink-0" />}
```
To:
```html
{i > 0 && <Icon name="lucide:chevron-right" size={14} class="text-accent-600 shrink-0" />}
```

Also make the separator chevrons slightly larger (size={16}) to match the indicator icon weight better. And update the indicator icon size to 16 as well.

### 4. Run verification
Run `pnpm astro check` — must pass.

### 5. Write report
Write results to `docs/tasks/task-20260606-implementer-v2-report.md` with:
- List of changes made
- Key HTML structure
- pnpm astro check result

## Expected Output
- Modified src/components/Header.astro with divider, indicator icon, and accent-colored chevrons
- Report at docs/tasks/task-20260606-implementer-v2-report.md

## Guardrails
- IMMUTABLE: Never modify spec files, plan files, or other task files
- Use semantic tokens only (text-accent-600 for accent color, bg-border for divider)
- No hardcoded colors
- Do NOT touch mobile breadcrumb behavior — only desktop improvements
- Keep existing accessibility (aria-label, aria-hidden on decorative elements)
