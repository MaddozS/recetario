# Task: Plan fixes for preparación section bugs

## Assigned Agent
kitchcalc-planner

## Context Received
- Spec: docs/analysis/analysis-20260704-preparacion-bugs.md
- State: docs/tasks/task-20260704-preparacion-bugs-state.json
- Memory context: none needed (bugs are self-contained)
- Context pack: none (orchestrator already read all relevant source files)

## Dependency And Parallel Safety
- Depends on: none
- Parallel group: none
- Parallel-safe: yes (single planner)
- Sibling tasks: none

## Skills
Selected:
- ponytail — minimal fixes, don't over-engineer

Discarded:
- design-system-verify — not needed for planning phase
- prisma-client-api — no DB changes
- ui-ux-pro-max — simple CSS fixes
- impeccable — not a design task

May load if needed:
- none

## Scope
Editable files (candidate):
- apps/web/src/styles/global.css — add list-style-type to contenteditable-editor ul/ol
- apps/web/src/lib/instructions-parser.ts — fix parseHtmlSteps regex
- apps/web/src/components/InstructionsEditor.astro — fix dividers and margins

Forbidden files:
- prisma/schema.prisma
- packages/*
- astro.config.mjs
- middleware.ts

## Instructions
Draft a small, verifiable implementation plan for the 4 bugs documented in the analysis. The analysis already contains root causes and proposed fixes. Your job is to produce a task plan with:
1. Task dependencies (all 3 changes can be in 1 builder task since they're 3 files, disjoint concerns)
2. Each task's scope, pre-existing code, and dependencies
3. Acceptance criteria per task
4. Validation commands
5. Risk assessment

## Acceptance Criteria
- Plan covers all 4 bugs from the analysis
- Plan is small and verifiable
- Plan includes validation strategy

## Reporting
Write report to: docs/plans/plan-20260704-preparacion-bugs.md
Return only: done docs/plans/plan-20260704-preparacion-bugs.md
