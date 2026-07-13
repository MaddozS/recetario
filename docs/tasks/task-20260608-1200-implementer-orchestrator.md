# Task: Improve orchestrator agent
Agent: implementer
Date: 2026-06-08
Analysis: [docs/analysis/analysis-20260608-1200-agent-improvements.md](../analysis/analysis-20260608-1200-agent-improvements.md)
Plan: [docs/plans/plan-20260608-1200-agent-improvements.md](../plans/plan-20260608-1200-agent-improvements.md)

## Goal
Mejorar `.opencode/agents/orchestrator.md` con múltiples enhancements basados en patrones de miobra.

## Context
El orchestrator actual tiene varias áreas de mejora:
1. Falta tabla de ejemplos concretos para branching decision
2. Falta spec quality gate
3. Falta sección Invariants en template de specs
4. Falta circuit breaker `/break-rework`
5. Falta rework loop clarification
6. Permissions son muy permisivas (edit: allow, bash: allow)
7. Falta flow analysis en template de specs
8. Workflow no incluye validator

## Skills Required
- none

## Files Involved
- `.opencode/agents/orchestrator.md`: modify — múltiples mejoras

## Files the Subagent May Create or Edit
**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file.

- [ ] `.opencode/agents/orchestrator.md` — mejorado con todos los enhancements
- [ ] `docs/tasks/task-20260608-1200-implementer-orchestrator-report.md` — report file (mandatory)

## Technical Steps

1. **Leer `.opencode/agents/orchestrator.md`** actual para entender estructura.

2. **Cambiar permissions en frontmatter**:
   ```yaml
   permission:
     edit: deny
     bash: deny
     task: allow
     read: allow
     glob: allow
     grep: allow
     skill: allow
     question: allow
     todowrite: allow
     doom_loop: deny
   ```

3. **Agregar tabla de ejemplos branching** (después de "Complexity assessment" section):
   ```markdown
   **Ejemplos concretos:**

   | Tarea del usuario | Decisión | Razón |
   |---|---|---|
   | "Cambiar color de botón de azul a verde" | **Ajuste** | Cambio de estilo sin nuevo estado/ruta. No afecta arquitectura. |
   | "Renombrar campo `recipeName` a `title` en Recipe model" | **Ajuste** | Refactor mecánico de naming. No afecta API contract. |
   | "Arreglar bug en parseNumberInput que no convierte coma a punto" | **Ajuste** | Bug fix localizado. No cambia contrato ni agrega estado. |
   | "Agregar nueva página `/produccion/resumen`" | **Feature** | Nueva página Astro → requiere layout, auth check, posiblemente feature flag. |
   | "Crear nueva ruta API `/api/stripe/portal`" | **Feature** | Nueva ruta API → requiere Stripe integration, webhook handling. |
   | "Agregar nuevo modelo Prisma `ProductionPlan`" | **Feature** | Nuevo modelo → requiere migración, queries con ownerId, posiblemente nuevas páginas. |
   | "Cambiar auth de Google OAuth a email/password" | **Feature** | Cambio arquitectónico en auth → afecta middleware, session handling, UI. |
   | "Agregar feature flag `advanced_analytics`" | **Feature** (borderline ajuste) | Si solo es agregar key a FREE_FEATURES → Ajuste. Si requiere UI para toggle y lógica de gating → Feature. |
   ```

4. **Agregar spec quality gate** (en Phase 2, después de "Spec process" step 4):
   ```markdown
   4.5. **Run spec quality checks** — Before showing spec to user, verify:
      - [ ] **Parallel functions enumerated**: If the feature touches multiple entry points or parallel code paths, the spec lists each function/component by name. No "all X entry points" or "both server and client" without naming.
      - [ ] **Flow analysis matches actual code**: For pages with data loops, the spec traces the actual frontmatter code and documents if data is per-request or per-iteration.
      - [ ] **Invariants present and specific**: If the feature modifies computed/derived fields (totals, counts, status transitions), the spec states the mathematical or business invariants that must be preserved.
      - [ ] **No placeholders**: All sections filled with concrete details, not "[TBD]" or "[TODO]".
      
      If any check returns FAIL, revise the spec to address each failure and re-run. Do NOT show spec to user with a FAIL on the gate.
   ```

5. **Agregar sección Invariants en Spec File Template** (después de "Error Handling"):
   ```markdown
   ### Invariants

   If the feature modifies any computed/derived field (e.g. totals, ingredient quantities, recipe costs, status transitions, aggregated counts), the spec MUST state the mathematical or business invariants that must be preserved. Examples:

   - Recipe cost features: `recipe.totalCost == sum(recipeIngredient.cost)` must hold after all transformations.
   - Production features: `sum(productionBatch.quantity) <= recipe.expectedYield` for linked batches.
   - Status features: `status` transitions follow the state machine: `draft → active → completed | cancelled`.
   - Billing features: `subscription.total == sum(lineItems.amount)` must hold.

   If no computed field is being modified, write "No invariants affected by this feature."

   **Before marking the spec as approved, the orchestrator MUST run the spec quality checks (step 4.5) to verify the invariants are present and specific.**
   ```

6. **Agregar Flow Analysis en Spec File Template** (después de "Architecture"):
   ```markdown
   ### Flow Analysis

   For every page or API route being modified or created, the spec MUST trace the actual code and document:

   1. **Single-record or looped?** Does the page display one item or iterate (e.g. `recipes.map()`)?
   2. **Data scope**: Is the data being added consumed at page level (once per load) or per-iteration (once per item)?
   3. **Anchor file + line range**: e.g. `src/pages/recipes/[id].astro:15-45` — the exact range to read.

   If a feature touches a looped page, the spec MUST ask: "Is this data per-iteration or global?" and answer it explicitly.

   Example:
   ```markdown
   ### Flow Analysis: Recipe Detail Page

   `src/pages/recipes/[id].astro` frontmatter (lines 15-45):
   1. Reads `recipeId` from `Astro.params`
   2. Fetches recipe with `db.recipes.findUnique({ where: { id: recipeId, ownerId } })`
   3. Fetches ingredients with `db.recipeIngredient.findMany({ where: { recipeId } })`
   4. Computes `totalCost` by summing `ingredient.price * recipeIngredient.quantity`

   **Design implication**: Cost breakdown must be per-ingredient, not top-level.
   The template must iterate `recipeIngredients` and compute line-item costs.
   ```

   **Before marking the spec as approved, the orchestrator MUST run the spec quality checks (step 4.5) to verify the flow analysis matches the actual code.**
   ```

7. **Agregar circuit breaker `/break-rework`** (en Phase 6b, después de step 5):
   ```markdown
   **Manual circuit breaker — `/break-rework` slash command:**

   The user may invoke the `/break-rework` slash command at any point during Phase 6b to manually halt the rework loop. This is a non-automatic circuit breaker — the orchestrator only halts when the user explicitly issues the command. When the command fires:

   - The orchestrator stops dispatching rework iterations.
   - The orchestrator reports the current state to the user: which findings remain unresolved, which have been fixed, and what partial state the codebase is in.
   - The user decides whether to resume Phase 6b, escalate, or abort the cycle.

   The slash command is **never** automatic. It is a human escape hatch, not a backstop.
   ```

8. **Agregar rework loop clarification** (al inicio de Phase 6b):
   ```markdown
   **Rework is a continuation of the original user prompt, not a new cycle.** The orchestrator does not increment any iteration counter when entering Phase 6b, and Phase 6b does not "reset" the cycle. The plan's `## Retrospective` section records the total rework count for transparency, but the cycle remains a single user-prompt unit of work.
   ```

9. **Agregar "NEVER" en Phase 6b**:
   ```markdown
   - Auto-halt the rework loop without an explicit `/break-rework` command from the user
   ```

10. **Actualizar Subagent Reference table** para incluir validator:
    ```markdown
    | Subagent | Type | Description |
    |----------|------|-------------|
    | `explorer` | `explorer` | Read-only codebase exploration, research, context analysis |
    | `implementer` | `implementer` | Implementation per task files, writes code + report |
    | `reviewer` | `reviewer` | Read-only semantic review (expected vs actual, pattern compliance, no commands) |
    | `validator` | `validator` | Read-only operational validation (astro check, eslint, build, visual QA) |
    | `closer` | `closer` | End-of-cycle. Mode ANALYZE: read-only post-mortem. Mode APPLY: applies user-approved improvements |
    ```

11. **Actualizar Phase 6 — Verification** para incluir validator:
    ```markdown
    ### Phase 6 — Verification

    1. After implementation tasks complete:
       a. Spawn `reviewer` (semántico, expected vs actual comparison, no commands).
       b. Read the review report.
       c. If PASS, spawn `validator` (operacional, astro check + eslint + build + visual QA).
       d. Read the validation report.
    2. **Decision**:
       - All acceptance criteria met and no blockers → proceed to Phase 7.
       - Criteria not met → enter Phase 6b (rework loop).
    ```

12. **Remover referencia a analyst** en Subagent Reference (si existe).

13. **Guardar report** en `docs/tasks/task-20260608-1200-implementer-orchestrator-report.md` con:
    - Todos los cambios realizados
    - Secciones agregadas
    - Permissions cambiadas

## Expected Output
- **Code changes**: `.opencode/agents/orchestrator.md` modificado con todos los enhancements
- **Report**: `docs/tasks/task-20260608-1200-implementer-orchestrator-report.md`

## Guardrails
- NO modificar otros archivos de agentes
- NO modificar código fuente
- NO modificar specs, plans, o analysis reports
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files
- **SCOPE**: Never create files outside the list above
