# Task: Mostrar InstructionsEditor en modo edición en tab Preparación

## Assigned Agent
kitchcalc-builder

## Context Received
- State: docs/tasks/task-20260702-recipe-fixes-state.json (rework loop 2)
- Explore report: docs/analysis/analysis-20260702-recipe-page-explore.md (reuse — codebase hasn't changed for this area)
- InstructionsEditor component: apps/web/src/components/InstructionsEditor.astro — renders rich text editor, expects props (recipeEditFormId, instructions, ingredients, recipeIngredientIds)

## Dependency And Parallel Safety
- Depends on: none (rework loop, independent fix)
- Parallel group: none
- Parallel-safe: yes — single file edit, no overlap

## Skills
Selected:
- ponytail — baseline lazy approach

Discarded:
- design-system-verify — no new UI components, just wiring existing component
- security-best-practices — no auth/data changes

## Scope

### Editable files:
- `apps/web/src/pages/recipes/[recipe].astro`

### Forbidden files:
- All other files

## Instructions

### Problem
En modo edición, el tab "Preparación" desaparece y el panel no muestra nada. El usuario no puede editar las instrucciones.

### Root cause
1. Tab button condicionado a `{!isEditMode && (` — solo aparece en vista
2. Panel condicionado a `{!isEditMode && ...}` — solo muestra RecipeInstructions o empty state en vista

### Fix

**1. Importar InstructionsEditor** (agregar al bloque de imports, ~line 24):
```astro
import InstructionsEditor from "../../components/InstructionsEditor.astro";
```

**2. Quitar `!isEditMode` del tab button** (line 985):
```astro
// Antes:
{!isEditMode && (
  <button role="tab" id="tab-preparacion" ...>
    Preparación
  </button>
)}

// Después:
<button role="tab" id="tab-preparacion" class="tab-btn px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors" aria-selected="false" aria-controls="panel-preparacion" data-tab="preparacion">
  Preparación
</button>
```

**3. Reestructurar el panel** (line 1339-1355) para manejar 3 estados:

```astro
<div id="panel-preparacion" role="tabpanel" aria-labelledby="tab-preparacion" class="tab-panel" hidden>
  {isEditMode ? (
    <InstructionsEditor
      recipeEditFormId={recipeEditFormId}
      instructions={instructions}
      ingredients={ingredients}
      recipeIngredientIds={recipeIngredients.map(ri => ri.ingredientId)}
    />
  ) : instructions ? (
    <RecipeInstructions
      instructions={instructions}
      ingredients={ingredients}
      isPro={hasCookingMode}
    />
  ) : (
    <div class="bg-card border-border mx-1 mt-6 overflow-hidden rounded-2xl border shadow-sm sm:mx-2 lg:mx-8">
      <div class="border-border-light flex items-center gap-3 border-b px-5 py-5 sm:px-6 lg:px-8">
        <h2 class="text-foreground flex items-center gap-2 text-sm font-bold">Preparación</h2>
      </div>
      <div class="px-5 py-12 sm:px-6 lg:px-8 text-center">
        <p class="text-muted-foreground text-sm">No hay instrucciones todavía.</p>
        <p class="text-subtle-foreground mt-2 text-xs">Hacé clic en <strong>Editar</strong> para agregar la preparación de esta receta.</p>
      </div>
    </div>
  )}
</div>
```

## Acceptance Criteria
- En modo edición: el tab "Preparación" es visible, al hacer clic muestra el InstructionsEditor con el contenido actual
- En modo vista con instrucciones: muestra RecipeInstructions como antes
- En modo vista sin instrucciones: muestra empty state con instrucciones

## Verification
Después de los cambios, correr:
1. `pnpm astro check` — debe pasar sin errores

## Reporting
Write report to: docs/tasks/task-20260702-recipe-fixes-v3-report.md
Return only: done docs/tasks/task-20260702-recipe-fixes-v3-report.md
