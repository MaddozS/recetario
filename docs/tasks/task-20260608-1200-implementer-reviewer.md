# Task: Refactor reviewer agent
Agent: implementer
Date: 2026-06-08
Analysis: [docs/analysis/analysis-20260608-1200-agent-improvements.md](../analysis/analysis-20260608-1200-agent-improvements.md)
Plan: [docs/plans/plan-20260608-1200-agent-improvements.md](../plans/plan-20260608-1200-agent-improvements.md)

## Goal
Refactorizar `.opencode/agents/reviewer.md` para enfocarse exclusivamente en análisis semántico (expected vs actual, pattern compliance, convention checks), removiendo toda referencia a ejecutar comandos.

## Context
Actualmente reviewer.md incluye instrucciones para ejecutar `pnpm astro check`, `pnpm eslint .`, y `pnpm build`. Estas responsabilidades se mueven al nuevo agente `validator`.

El reviewer debe enfocarse en:
- Expected vs actual comparison
- Pattern compliance (inspección visual de código)
- Convention compliance (verificación de patrones sin ejecutar)
- Cross-reference verification (ej: ¿config_apiviews.json actualizado?)

## Skills Required
- none

## Files Involved
- `.opencode/agents/reviewer.md`: modify — remover referencias a comandos, enfocar en análisis semántico

## Files the Subagent May Create or Edit
**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file.

- [ ] `.opencode/agents/reviewer.md` — refactorizado para análisis semántico
- [ ] `docs/tasks/task-20260608-1200-implementer-reviewer-report.md` — report file (mandatory)

## Technical Steps

1. **Leer `.opencode/agents/reviewer.md`** actual para entender estructura.

2. **Modificar el archivo** con los siguientes cambios:

   a. **Actualizar description** en frontmatter:
   ```yaml
   description: "Validador semántico read-only para Recetario. Realiza expected vs actual comparison, pattern compliance, naming, y convention checks. NO ejecuta comandos (astro check, eslint, build). Operacionalmente distinto del validator (que ejecuta comandos)."
   ```

   b. **Remover de Approach section** (paso 4):
   - Eliminar: `**Lint** — \`pnpm eslint .\` for changed files`
   - Eliminar: `**Astro check** — \`pnpm astro check\` to verify TypeScript and Astro correctness`
   - Eliminar: `**Build** — \`pnpm build\` to verify the project compiles`

   c. **Remover de Report Format**:
   - Eliminar sección `### Lint` con `pnpm eslint .`
   - Eliminar sección `### Astro Check` con `pnpm astro check`
   - Eliminar sección `### Build` con `pnpm build`

   d. **Actualizar "No quick reviews" section**:
   - Cambiar: "At least `pnpm astro check` verification" → "Pattern compliance check (with the playbook below)"
   - Cambiar: "Regressions check for modified files" → "Cross-reference verification (e.g., did related files get updated?)"

   e. **Agregar tabla de comparación con validator** (después de "Constraints"):
   ```markdown
   ## Role vs validator

   You run **before** `validator` in the verification sequence. The orchestrator's Phase 6 is:

   \`\`\`
   implementer
     -> reviewer (semantic — you, this agent)
     -> validator (operational — astro check, eslint, build, visual QA)
     -> closer (post-mortem)
   \`\`\`

   | Aspect | reviewer (you, semantic) | validator (operational) |
   |---|---|---|
   | Focus | Expected vs actual, design rationale, pattern compliance, naming, convention compliance | Astro check, eslint, build, visual QA |
   | Output | Findings table with severity, expected vs actual | Pass/Partial/Fail with checks executed |
   | Runs astro check | NO | YES |
   | Runs eslint | NO | YES |
   | Runs build | NO | YES |
   | Visual QA | NO | YES (desktop + mobile parity) |
   | Touches running code | NO | YES (runs commands) |

   You detect semantic deviations (e.g., "the implementer added a new page but did not add session check"). The validator catches type errors, lint violations, and build failures.
   ```

   f. **Agregar en Constraints**:
   ```markdown
   - **Do NOT run astro check, eslint, or build**. Command execution is the validator's job. Running commands here duplicates work and increases the cycle time.
   ```

   g. **Actualizar Review Checklist**:
   - En sección "Astro-specific", mantener los checks pero aclarar que son inspección visual, no ejecución:
   ```markdown
   ### Astro-specific (inspección visual, no ejecución)
   - [ ] Client-side bindings use `data-*-bound="1"` guard
   - [ ] Event listeners bound on both `astro:page-load` and `astro:after-swap`
   - [ ] Dialog backdrops use `backdrop:bg-backdrop/50`
   - [ ] No Astro Actions (not used in this project)
   ```

3. **Guardar report** en `docs/tasks/task-20260608-1200-implementer-reviewer-report.md` con:
   - Cambios realizados
   - Secciones removidas
   - Secciones agregadas

## Expected Output
- **Code changes**: `.opencode/agents/reviewer.md` modificado
- **Report**: `docs/tasks/task-20260608-1200-implementer-reviewer-report.md`

## Guardrails
- NO modificar otros archivos de agentes
- NO modificar código fuente
- NO modificar specs, plans, o analysis reports
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files
- **SCOPE**: Never create files outside the list above
