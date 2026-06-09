# Plan: Recipe Detail Header Layout Redesign

Created: 2026-06-07
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20260607-recipe-header-layout.md

## Goal
Reorganize recipe detail page header from 3 rows to 2 rows with dropdown actions menu, improving visual hierarchy and mobile experience.

## Acceptance Criteria
- [ ] Header displays in 2 rows: title+mezclas (row 1), badge+timestamp+menu (row 2)
- [ ] Actions menu dropdown opens on click, closes on outside click or selection
- [ ] Menu contains: Editar, Duplicar (conditional), Eliminar
- [ ] Mobile layout stacks appropriately with menu in bottom-right
- [ ] Edit mode shows inputs in row 1, Guardar/Cancelar in row 2
- [ ] All semantic tokens preserved (no hardcoded colors)
- [ ] `pnpm astro check` passes
- [ ] `pnpm eslint .` passes

## Analysis Summary
- Header currently uses 3 separate div rows with inconsistent spacing
- Actions bar (Editar/Duplicar/Eliminar) takes full row despite being small buttons
- Title competes with actions for visual attention
- Mobile experience cramped with horizontal button row

## User Stories
- As a user, I want the recipe title to be the focal point of the header so I can quickly identify the recipe
- As a user, I want actions organized in a menu so the interface feels less cluttered
- As a mobile user, I want the header to stack cleanly without horizontal scrolling

## Design Rationale
- **2-row layout**: Consolidates 3 rows into 2, reducing vertical space while improving organization
- **Dropdown menu**: Removes button row clutter, consistent with modern UI patterns
- **Title prominence**: Title alone in row 1 establishes clear visual hierarchy
- **Mobile-first**: Stack order prioritizes content (title → metadata → actions)

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Dropdown menu JS complexity | Medium | Use simple toggle with data attributes, close on outside click |
| Edit mode layout breaks | Low | Test both view and edit modes thoroughly |
| Icon not in whitelist | Low | Verified `ellipsis-vertical` already in astro.config.mjs |

## Tasks
### Task 1: Implement Header Layout Redesign
- **Agent**: implementer
- **Skills**: ui-ux-pro-max, caveman
- **Summary**: Modify `src/pages/recipes/[recipe].astro` lines 548-626 to implement 2-row header with dropdown menu

## Retrospective
[To be filled by orchestrator after Phase 7]
