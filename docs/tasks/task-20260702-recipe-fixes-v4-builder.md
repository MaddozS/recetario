# Task: Restore preparación tab + editor (v4 — rework loop 3)

## Assigned Agent
kitchcalc-builder

## Context Received
- State: docs/tasks/task-20260702-recipe-fixes-state.json (rework loop 3)
- The v3 builder's Python script corrupted/reverted parts of [recipe].astro. The preparación tab and InstructionsEditor are completely gone. RecipeInstructions is back inside the ingredientes tab.

## Dependency And Parallel Safety
- Depends on: none
- Parallel group: none
- Parallel-safe: yes

## Skills
Selected:
- ponytail — lazy diff

Discarded:
- design-system-verify — no new colors/icons

## Scope

### Editable file:
- `apps/web/src/pages/recipes/[recipe].astro`

### Forbidden:
- All other files

## Current file state

### Imports (line 24):
```astro
import RecipeInstructions from '../../components/RecipeInstructions.astro';
```

### Tab bar (lines 953-985) — missing preparación:
```astro
<div class="flex border-b border-border mb-6" role="tablist" id="recipe-tabs">
  <button ... data-tab="ingredientes">Ingredientes</button>
  <button ... data-tab="costos-fijos">Costos Fijos</button>
  <button ... data-tab="presentaciones">Presentaciones</button>
</div>
```

### RecipeInstructions (lines 1178-1187) — INSIDE panel-ingredientes:
```astro
{!isEditMode && instructions && (
  <div class="mt-6">
    <RecipeInstructions instructions={instructions} ingredients={ingredients} isPro={hasCookingMode} />
  </div>
)}
```

### End of page (line 1342-1343) — no preparación panel:
```astro
      </div>   <!-- closes panel-presentaciones -->
    </div>     <!-- closes inner wrapper -->
  </div>       <!-- closes transition wrapper -->
```

### FinancialSummary (line 943) — reverted to pt-6:
```astro
<div class="pt-6">
```

### JS tabIds (line 1500) — missing preparacion:
```js
const tabIds = ['ingredientes', 'costos-fijos', 'presentaciones'];
```

## Instructions — 6 changes in order

### Change 1: Fix FinancialSummary spacing
Line 943: `pt-6` → `py-6 sm:py-8`

### Change 2: Add InstructionsEditor import
After line 24 (after RecipeInstructions import), add:
```astro
import InstructionsEditor from '../../components/InstructionsEditor.astro';
```

### Change 3: Remove RecipeInstructions from panel-ingredientes
Lines 1178-1187: delete the entire `{!isEditMode && instructions && ( ... )}` block.

### Change 4: Add preparación tab button
After the Presentaciones button (line 984, before `</div>`), add:
```astro
        <button role="tab" id="tab-preparacion" class="tab-btn px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors" aria-selected="false" aria-controls="panel-preparacion" data-tab="preparacion">
          Preparación
        </button>
```

### Change 5: Add preparación panel
After the presentaciones panel closing `</div>` (~line 1342), BEFORE the `</div>` of the inner wrapper, add:
```astro
      <!-- Preparación -->
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

### Change 6: Update tabIds array
Line 1500: `const tabIds = ['ingredientes', 'costos-fijos', 'presentaciones'];` 
→ `const tabIds = ['ingredientes', 'costos-fijos', 'presentaciones', 'preparacion'];`

## Tool notes
If the `edit` tool fails with bracket-filename errors on `[recipe].astro`, use the `write` tool to rewrite the affected sections. Do NOT use Python/sed/Node.js scripts. If all tools fail, stop and report the failure to the orchestrator.

## Verification
After all changes:
1. `pnpm astro check` — must pass with 0 errors
2. Verify the tab button exists in the HTML after the Presentaciones button
3. Verify the panel exists with the ternary structure (isEditMode ? InstructionsEditor : instructions ? RecipeInstructions : empty state)

## Reporting
Write report to: docs/tasks/task-20260702-recipe-fixes-v4-report.md
Return only: done docs/tasks/task-20260702-recipe-fixes-v4-report.md
