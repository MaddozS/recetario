# Task: Improve explorer agent
Agent: implementer
Date: 2026-06-08
Analysis: [docs/analysis/analysis-20260608-1200-agent-improvements.md](../analysis/analysis-20260608-1200-agent-improvements.md)
Plan: [docs/plans/plan-20260608-1200-agent-improvements.md](../plans/plan-20260608-1200-agent-improvements.md)

## Goal
Agregar parallel code paths identification a `.opencode/agents/explorer.md`.

## Context
Miobra explorer identifica "sibling functions" — todos los entry points que necesitan cambios. Esto previene que el orchestrator escriba instrucciones vagas como "todos los entry points" y force la enumeración explícita.

Para Recetario, esto es relevante cuando un feature toca múltiples páginas, componentes, o rutas API similares.

## Skills Required
- none

## Files Involved
- `.opencode/agents/explorer.md`: modify — agregar parallel code paths identification

## Files the Subagent May Create or Edit
**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file.

- [ ] `.opencode/agents/explorer.md` — agregar parallel code paths identification
- [ ] `docs/tasks/task-20260608-1200-implementer-explorer-report.md` — report file (mandatory)

## Technical Steps

1. **Leer `.opencode/agents/explorer.md`** actual para entender estructura.

2. **Agregar sección "Parallel Code Paths Identification"** después de "Deep Context Analysis" section:

```markdown
## Parallel Code Paths Identification

When exploring a target area, identify ALL sibling functions, components, or routes that might need similar changes. The orchestrator must NOT write "all X entry points" — it must enumerate them explicitly.

**What to look for:**

1. **Multiple pages with similar structure**: If the feature touches `/recipes`, check if `/ingredients`, `/produccion`, or other pages need similar changes.
2. **Server + client pairs**: If the feature touches `src/lib/auth.ts` (server), check if `src/lib/auth-client.ts` (client) needs updates.
3. **Create + update + delete**: If the feature touches a create operation, check if update and delete operations need similar changes.
4. **Desktop + mobile**: If the feature touches a desktop layout, check if mobile layout needs updates.
5. **Multiple components using same pattern**: If the feature touches one `RecipeCard`, check if other card components need similar changes.

**How to report:**

In your report, list ALL sibling functions/components by name and file path. Example:

```markdown
## Parallel Code Paths Identified

If the feature modifies ingredient cost calculation, the following entry points need updates:

1. `src/pages/recipes/[id].astro` — recipe detail page (computes totalCost)
2. `src/pages/recipes/index.astro` — recipe list page (shows cost per recipe)
3. `src/components/RecipeCard.astro` — card component (shows cost preview)
4. `src/lib/db/recipes.ts` — `getRecipeWithCost()` function
5. `src/lib/db/ingredients.ts` — `getIngredientCost()` helper

All 5 entry points must be updated to use the new cost calculation logic.
```

**Why this matters:** The orchestrator uses your report to write task files. If you say "update all pages that show cost", the orchestrator will copy that vague instruction. If you enumerate the 5 specific files, the orchestrator will list them explicitly in the task file, and the implementer will not miss any.
```

3. **Agregar en Report Template** (después de "Tech Debt / Potential Refactors"):

```markdown
## Parallel Code Paths Identified
- [Sibling function/component 1]: [file path + brief description]
- [Sibling function/component 2]: [file path + brief description]
- [Total count]: [N entry points that need similar changes]
```

4. **Guardar report** en `docs/tasks/task-20260608-1200-implementer-explorer-report.md` con:
   - Secciones agregadas
   - Ubicación de los cambios

## Expected Output
- **Code changes**: `.opencode/agents/explorer.md` modificado
- **Report**: `docs/tasks/task-20260608-1200-implementer-explorer-report.md`

## Guardrails
- NO modificar otros archivos de agentes
- NO modificar código fuente
- NO modificar specs, plans, o analysis reports
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files
- **SCOPE**: Never create files outside the list above
