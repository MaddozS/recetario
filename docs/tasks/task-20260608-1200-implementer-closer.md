# Task: Improve closer agent
Agent: implementer
Date: 2026-06-08
Analysis: [docs/analysis/analysis-20260608-1200-agent-improvements.md](../analysis/analysis-20260608-1200-agent-improvements.md)
Plan: [docs/plans/plan-20260608-1200-agent-improvements.md](../plans/plan-20260608-1200-agent-improvements.md)

## Goal
Mejorar `.opencode/agents/closer.md` con Convention Compliance como dimensión #1 y skill location rule.

## Context
Miobra closer-analyze tiene "Convention Compliance" como primera dimensión de análisis, con checks específicos para detectar desviaciones de convenciones del codebase.

Recetario closer tiene "Code Quality" pero no está estructurado como dimensión principal con checks específicos.

Adicionalmente, miobra tiene una "skill location rule" que define dónde deben ir skills nuevos.

## Skills Required
- none

## Files Involved
- `.opencode/agents/closer.md`: modify — agregar Convention Compliance y skill location rule

## Files the Subagent May Create or Edit
**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file.

- [ ] `.opencode/agents/closer.md` — mejorado con Convention Compliance y skill location rule
- [ ] `docs/tasks/task-20260608-1200-implementer-closer-report.md` — report file (mandatory)

## Technical Steps

1. **Leer `.opencode/agents/closer.md`** actual para entender estructura.

2. **Reordenar Analysis Dimensions** para que Convention Compliance sea #1:

   Cambiar de:
   ```
   ### Analysis Dimensions
   1. **Agent Performance**: ...
   2. **Skills Effectiveness**: ...
   3. **Code Quality**: ...
   4. **Process Efficiency**: ...
   ```

   A:
   ```
   ### Analysis Dimensions

   #### 1. Convention Compliance (highest priority)

   For every code change in the cycle, verify against existing codebase conventions:

   - **Prisma queries**: `ownerId` in every query (`findMany`, `findFirst`, `update`, `delete`, `upsert`, `count`). Verify via `grep "ownerId" src/lib/db/*.ts`.
   - **Barrel imports**: All Prisma imports use `@/lib/db/*` barrel, not raw `@/lib/prisma`. Verify via `grep "from '@/lib/prisma'" src/**/*.ts`.
   - **Recipe update pattern**: Recipe updates use `$transaction` that deletes all `RecipeIngredient` rows then re-creates. Verify in `src/lib/db/recipes.ts`.
   - **Ingredient delete pattern**: Ingredient delete checks for recipe references and returns `{ status: "blocked", recipes: [...] }`. Verify in `src/lib/db/ingredients.ts`.
   - **UI components**: All UI uses `@/components/ui` barrel (Button, Input, Dialog, Card, Badge, etc.). No direct imports from component files.
   - **Semantic tokens**: No hardcoded colors. All colors use semantic tokens (`bg-card`, `text-foreground`, `border-border`, `accent-*`). Verify via `grep -E "bg-(blue|red|green|slate)" src/**/*.astro`.
   - **Client bindings**: All client-side bindings use `data-*-bound="1"` guard. Event listeners bound on both `astro:page-load` and `astro:after-swap`.
   - **Dialog backdrops**: All Dialog backdrops use `backdrop:bg-backdrop/50`, not `backdrop:bg-slate-900/50`.
   - **Forms**: All forms use POST to same page, `Astro.request.formData()`, `parseNumberInput()` for Spanish decimals, redirect after success.
   - **Auth checks**: All protected pages check `Astro.locals.session` and redirect to `/sign-in`.
   - **Feature flags**: Feature flags use `FREE_FEATURES` object, not hardcoded booleans.
   - **Stripe API version**: All Stripe code uses API version `2026-04-22.dahlia`.

   If the spec introduced a value/pattern that drifts from the codebase, flag it as a "spec quality" issue (not a code quality issue).

   **WHY this dimension is first**: Convention compliance catches deviations early, before they become tech debt. If a new feature uses hardcoded colors when the codebase uses semantic tokens, that's a pattern violation that will propagate.

   #### 2. Agent Performance
   Did each agent execute per its spec? Where did agents struggle? Should specs be clearer? Different permissions or model?

   #### 3. Skills Effectiveness
   Were loaded skills sufficient? What skills would have accelerated work? Suggest new skills with rationale.

   #### 4. Code Quality
   Do changes follow AGENTS.md patterns? Beyond convention compliance, is the code well-structured, readable, and maintainable? Are there any anti-patterns or code smells?

   #### 5. Process Efficiency
   Did the analysis→plan→tasks→build→validate flow work? Was complexity decision correct? Bottlenecks? Could tasks have parallelized? Rework documentation complete?
   ```

3. **Agregar skill location rule** en "New Skills Suggested" section:

```markdown
### New Skills Suggested
- **[skill-name]**: [purpose, which agent uses it]

**Skill location rule**: All new skills MUST be suggested for `.agents/skills/` (NOT `.opencode/skills/`). Skills in `.agents/skills/` are available to any agent, including generic subagents. Project-specific skills already exist in `.opencode/skills/` (e.g. `graphify`) and should be extended there only when the skill is tightly coupled to recetario's project conventions. Cross-project or agent-agnostic skills (UX, process, debugging, etc.) belong in `.agents/skills/`.
```

4. **Actualizar Report Format** para reflejar nueva dimensión:

```markdown
## Observations

### 1. Convention Compliance
- [Well-executed patterns]
- [Improvement areas]
- [Specific deviations found]

### 2. Agent Performance
- **implementer**: [observations]
- **explorer**: [observations]
- **reviewer**: [observations]
- **validator**: [observations]

### 3. Skills Effectiveness
- [Loaded skills that helped]
- [Missing skills that would have helped]

### 4. Code Quality
- [Well-executed patterns]
- [Improvement areas]

### 5. Process Efficiency
- [What flowed well]
- [Bottlenecks]
- [Complexity decision assessment]
```

5. **Guardar report** en `docs/tasks/task-20260608-1200-implementer-closer-report.md` con:
   - Dimensiones reordenadas
   - Skill location rule agregada
   - Report format actualizado

## Expected Output
- **Code changes**: `.opencode/agents/closer.md` modificado
- **Report**: `docs/tasks/task-20260608-1200-implementer-closer-report.md`

## Guardrails
- NO modificar otros archivos de agentes
- NO modificar código fuente
- NO modificar specs, plans, o analysis reports
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files
- **SCOPE**: Never create files outside the list above
