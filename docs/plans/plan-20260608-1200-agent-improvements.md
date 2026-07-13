# Plan: Agent Ecosystem Improvements

Created: 2026-06-08 12:00
Orchestrator: orchestrator
Complexity: feature
Analysis: [docs/analysis/analysis-20260608-1200-agent-improvements.md](../analysis/analysis-20260608-1200-agent-improvements.md)

## Goal
Mejorar el ecosistema de agentes de recetario basándose en patrones probados en miobra, adaptados al stack Astro/TypeScript.

## Acceptance Criteria
- [ ] Reviewer separado en reviewer (semántico) + validator (operacional)
- [ ] Orchestrator con tabla de ejemplos branching
- [ ] Spec quality gate documentado en orchestrator
- [ ] Sección Invariants en template de specs
- [ ] Git safety check en implementer
- [ ] Circuit breaker `/break-rework` documentado
- [ ] Convention Compliance como dimensión #1 en closer
- [ ] Skill location rule documentada en closer
- [ ] Parallel code paths identification en explorer
- [ ] Rework loop clarification en orchestrator
- [ ] Orchestrator permissions: edit: deny, bash: deny
- [ ] Flow analysis en template de specs (adaptado para Astro)
- [ ] analyst.md eliminado
- [ ] Todos los agentes actualizados funcionan coherentemente

## Analysis Summary
El ecosistema actual tiene redundancias (analyst/closer), responsabilidades mezcladas (reviewer hace semántico + operacional), y falta patrones probados en miobra como tabla de ejemplos, spec quality gate, invariants, y circuit breakers.

## User Stories
- Como orchestrator, quiero una tabla de ejemplos claros para decidir ajuste vs feature sin ambigüedad.
- Como orchestrator, quiero un spec quality gate para asegurar calidad antes de mostrar specs al usuario.
- Como reviewer, quiero enfocarme solo en análisis semántico sin ejecutar comandos.
- Como validator, quiero ser el único responsable de ejecutar astro check, eslint, y build.
- Como implementer, quiero un git safety check para no perder trabajo accidentalmente.
- Como usuario, quiero un `/break-rework` para detener loops de rework infinitos.
- Como closer, quiero Convention Compliance como dimensión principal para detectar desviaciones temprano.
- Como explorer, quiero identificar parallel code paths para que el orchestrator no escriba "todos los entry points".

## Design Rationale

### Separación reviewer/validator
**Decisión**: Separar en dos agentes distintos.
**Trade-offs**:
- ✅ Responsabilidades claras
- ✅ Modelos diferentes (reviewer: qwen3.7-plus para análisis profundo; validator: flash para velocidad)
- ✅ Ciclos más rápidos (validator puede correr en paralelo con reviewer en algunos casos)
- ❌ Un agente más que mantener
**Alternativa rechazada**: Mantener reviewer unificado — más simple pero menos especializado.

### Spec quality gate
**Decisión**: Documentar checks de calidad en orchestrator, no como skill separado.
**Trade-offs**:
- ✅ Sin dependencias externas
- ✅ Integrado en el flujo natural
- ❌ No es ejecutable automáticamente
**Alternativa rechazada**: Crear skill `spec-quality-gate` — overkill para documentación.

### Orchestrator permissions
**Decisión**: edit: deny, bash: deny.
**Rationale**: El orchestrator solo debe crear archivos en docs/ vía herramientas de escritura, no editar código fuente ni ejecutar comandos del proyecto.

### Eliminar analyst
**Decisión**: Eliminar analyst.md, usar solo closer.
**Rationale**: analyst.md y closer Mode ANALYZE hacen exactamente lo mismo. Mantener ambos causa confusión sobre cuál usar.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Cambios rompen flujo existente | Alto | Implementar gradualmente, validar cada agente después de cambios |
| Validator nuevo no tiene contexto suficiente | Medio | Incluir playbook específico para Astro/TypeScript |
| Orchestrator con edit: deny no puede crear docs | Bajo | Edit: deny es para archivos fuera de docs/; herramientas de escritura siguen funcionando |
| Confusión sobre qué agente usar | Medio | Documentar claramente responsabilidades en cada agente |

## Tasks

### Task 1: Crear validator agent
- **Agent**: implementer
- **Skills**: none
- **Summary**: Crear `.opencode/agents/validator.md` con responsabilidades operacionales (astro check, eslint, build, visual QA). Basado en miobra-validator pero adaptado para Astro.

### Task 2: Refactor reviewer agent
- **Agent**: implementer
- **Skills**: none
- **Summary**: Modificar `.opencode/agents/reviewer.md` para enfocarse solo en análisis semántico (expected vs actual, pattern compliance, convention checks). Remover toda referencia a ejecutar comandos.

### Task 3: Mejorar orchestrator agent
- **Agent**: implementer
- **Skills**: none
- **Summary**: Modificar `.opencode/agents/orchestrator.md` para:
  - Agregar tabla de ejemplos branching
  - Agregar spec quality gate
  - Agregar sección Invariants en template de specs
  - Agregar circuit breaker `/break-rework`
  - Agregar rework loop clarification
  - Cambiar permissions a edit: deny, bash: deny
  - Agregar flow analysis en template de specs
  - Actualizar workflow para incluir validator
  - Remover referencia a analyst

### Task 4: Mejorar implementer agent
- **Agent**: implementer
- **Skills**: none
- **Summary**: Modificar `.opencode/agents/implementer.md` para agregar git safety check antes de operaciones git destructivas.

### Task 5: Mejorar explorer agent
- **Agent**: implementer
- **Skills**: none
- **Summary**: Modificar `.opencode/agents/explorer.md` para agregar parallel code paths identification.

### Task 6: Mejorar closer agent
- **Agent**: implementer
- **Skills**: none
- **Summary**: Modificar `.opencode/agents/closer.md` para:
  - Agregar Convention Compliance como dimensión #1
  - Agregar skill location rule

### Task 7: Eliminar analyst agent
- **Agent**: implementer
- **Skills**: none
- **Summary**: Eliminar `.opencode/agents/analyst.md`.

## Retrospective

**Executed**: 2026-06-08 21:42
**Rework iterations**: 0
**Status**: ✅ Complete — all 7 tasks executed in parallel, all passed

### Results
| Task | Agent File | Status | Notes |
|------|-----------|--------|-------|
| 1. Create validator | `validator.md` | ✅ Created | 5.2KB, operational validation |
| 2. Refactor reviewer | `reviewer.md` | ✅ Modified | Semantic-only, removed commands |
| 3. Improve orchestrator | `orchestrator.md` | ✅ Modified | 33KB, 10+ enhancements |
| 4. Git safety (implementer) | `implementer.md` | ✅ Modified | Safety check + constraint #11 |
| 5. Parallel paths (explorer) | `explorer.md` | ✅ Modified | Code paths identification |
| 6. Convention Compliance (closer) | `closer.md` | ✅ Modified | 5 dimensions, skill location |
| 7. Delete analyst | `analyst.md` | ✅ Deleted | Redundant with closer |

### Final Agent Ecosystem
6 agents (was 7): orchestrator, implementer, explorer, reviewer, validator (new), closer

### Key Improvements
- Reviewer/validator separation (semántico vs operacional)
- Orchestrator: branching examples, spec quality gate, invariants, flow analysis, circuit breaker, rework clarification, strict permissions
- Implementer: git safety check
- Explorer: parallel code paths identification
- Closer: Convention Compliance as #1 dimension, skill location rule
- Analyst eliminated (redundant)
