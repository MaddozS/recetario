# Task: Improve implementer agent
Agent: implementer
Date: 2026-06-08
Analysis: [docs/analysis/analysis-20260608-1200-agent-improvements.md](../analysis/analysis-20260608-1200-agent-improvements.md)
Plan: [docs/plans/plan-20260608-1200-agent-improvements.md](../plans/plan-20260608-1200-agent-improvements.md)

## Goal
Agregar git safety check a `.opencode/agents/implementer.md` para prevenir pérdida accidental de trabajo.

## Context
Miobra builder tiene un git safety check que previene pérdida de trabajo no commiteado. Recetario implementer no tiene esto.

El safety check debe ejecutarse antes de cualquier operación git destructiva (`git checkout`, `git reset`, `git stash`).

## Skills Required
- none

## Files Involved
- `.opencode/agents/implementer.md`: modify — agregar git safety check

## Files the Subagent May Create or Edit
**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file.

- [ ] `.opencode/agents/implementer.md` — agregar git safety check
- [ ] `docs/tasks/task-20260608-1200-implementer-agent-report.md` — report file (mandatory)

## Technical Steps

1. **Leer `.opencode/agents/implementer.md`** actual para entender estructura.

2. **Agregar sección "Git Safety Check"** después de "Required Workflow" section:

```markdown
## Git Safety Check

Before using `git checkout`, `git reset`, or `git stash` on any file, run this check:

\`\`\`bash
# Always run this BEFORE touching files with git operations:
git status --porcelain
\`\`\`

If any file shows `M` (modified) or `??` (untracked), do NOT use `git checkout -- <file>`. Instead:

- Use `git stash push -m "WIP <feature> <phase>" -- <file>` to save changes
- Recover with `git stash pop` when ready

**WHY**: This prevents accidental loss of uncommitted work. If you run `git checkout -- <file>` on a modified file, the changes are lost (except via reflog, which is fragile).
```

3. **Agregar en Hard Constraints** (después de constraint 10):

```markdown
11. **GIT SAFETY** — Before using `git checkout`, `git reset`, or `git stash` on any file, run `git status --porcelain` first. If the file has uncommitted changes, either `git stash push -- <file>` (to recover later via `git stash pop`) or commit them first. NEVER use `git checkout -- <file>` on a file with uncommitted changes during debugging — this silently discards work and cannot be recovered.
```

4. **Guardar report** en `docs/tasks/task-20260608-1200-implementer-agent-report.md` con:
   - Secciones agregadas
   - Ubicación de los cambios

## Expected Output
- **Code changes**: `.opencode/agents/implementer.md` modificado
- **Report**: `docs/tasks/task-20260608-1200-implementer-agent-report.md`

## Guardrails
- NO modificar otros archivos de agentes
- NO modificar código fuente
- NO modificar specs, plans, o analysis reports
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files
- **SCOPE**: Never create files outside the list above
