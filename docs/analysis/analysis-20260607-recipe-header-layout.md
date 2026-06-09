# Analysis Report: Recipe Detail Header Layout Redesign

Created: 2026-06-07
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Redesign recipe detail page header from 3 cramped rows to 2 organized rows with dropdown actions menu.

## Target Location
- **Primary anchor**: `src/pages/recipes/[recipe].astro` (lines 548-626)
- **Layer**: page template

## Surrounding Context
- Header uses Tailwind utility classes with semantic tokens
- Components: Button, Badge, Icon from `@/components/ui` barrel
- FinancialSummary component sits below header (line 629)
- Edit mode reorganizes header to show inputs instead of title/badge

## Detected Tech Debt / Potential Refactors
- Mezclas counter uses `<a>` tags with full page reloads (lines 619, 621)
- Category badge uses hardcoded inline classes instead of Badge component variants
- Edit mode title input lacks aria-label

## Graphify Findings
- Header layout fully contained in `[recipe].astro`
- No separate header component for recipe detail
- All icons verified in astro.config.mjs whitelist

## Codebase Patterns to Follow
- **Page pattern**: Astro `.astro` file with frontmatter + template
- **UI**: `@/components/ui` barrel (Button, Badge, Icon)
- **Forms**: POST to same page, `Astro.request.formData()`
- **Semantic tokens**: bg-card, text-foreground, border-border, accent-*

## Complexity Assessment
- **Decision**: ajuste
- **Rationale**: UI layout change only. No new pages, routes, API endpoints, database changes, or auth modifications. Pure Tailwind class reorganization + dropdown menu addition.

## Dependencies & Prerequisites
- `lucide:ellipsis-vertical` icon already in whitelist (astro.config.mjs line 48)
- No new dependencies required

## Past Related Work
- Explorer report: `docs/tasks/task-20260607-recipe-header-explore-report.md`
