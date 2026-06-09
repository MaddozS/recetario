# Task: Implement Recipe Header Layout Redesign
Agent: implementer
Date: 2026-06-07
Analysis: docs/analysis/analysis-20260607-recipe-header-layout.md
Plan: docs/plans/plan-20260607-recipe-header-layout.md

## Goal
Reorganize recipe detail page header from 3 rows to 2 rows with dropdown actions menu.

## Context
User approved "Enfoque A" design: 2-row header with title+mezclas in row 1, badge+timestamp+actions menu in row 2. Actions menu is a dropdown with Editar, Duplicar (conditional), Eliminar.

## Skills Required
- **ui-ux-pro-max**: For responsive layout patterns, touch targets, accessibility
- **caveman**: For concise communication

## Files Involved
- `src/pages/recipes/[recipe].astro`: modify lines 548-626 (header section)

## Technical Steps

1. **Replace actions bar (line 549-568)** with dropdown menu button:
   - Remove the entire `<div class="flex items-center justify-between gap-3 mb-2 px-1">` block
   - Add menu button in row 2 (see below)

2. **Reorganize into 2-row structure**:
   
   **Row 1 container** (replaces lines 583-626):
   ```astro
   <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3 pb-3">
     <!-- Title (left) -->
     <div class="flex-1">
       {isEditMode ? (
         <input id="recipe-name-input" name="recipeName" form={recipeEditFormId} type="text" 
           class="w-full text-3xl sm:text-4xl leading-tight font-black bg-background border border-border rounded-xl p-2 text-foreground focus:ring-2 focus:ring-accent-500/20"
           value={name} />
       ) : (
         <h1 class="text-3xl sm:text-4xl leading-tight font-black text-foreground">{name}</h1>
       )}
     </div>
     
     <!-- Mezclas counter (right) -->
     <div class="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
       {!isEditMode && (
         <form method="get" data-astro-reload class:list={[
           "flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 shadow-sm sm:w-auto sm:justify-start transition-colors",
           showAdjustedQuantity ? "border-accent-200 bg-accent-50/30" : "border-border bg-card"
         ]}>
           <span class="text-[10px] font-black uppercase tracking-widest text-subtle-foreground px-2">Mezclas</span>
           <div class="flex items-center gap-1 bg-background rounded-full p-1 border border-border-light">
             <a href={multiplierDownHref} data-astro-reload class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-hover-muted text-muted-foreground font-bold transition-colors active:scale-95">-</a>
             <input type="number" name="multiplier" value={multiplier} step="0.0001" min="0.0001" 
               class="w-10 bg-transparent text-center font-mono font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 p-0 border-none text-sm tabular-nums" 
               onchange="this.form.submit()" aria-label="Multiplicador" />
             <a href={multiplierUpHref} data-astro-reload class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-hover-muted text-muted-foreground font-bold transition-colors active:scale-95">+</a>
           </div>
         </form>
       )}
     </div>
   </div>
   ```

   **Row 2 container** (replaces badge row at line 571):
   ```astro
   <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
     <!-- Badge + timestamp (left) -->
     <div class="flex items-center gap-3 text-sm font-medium text-muted-foreground">
       <Badge variant="category" color="accent" class="gap-1.5 px-3 py-1 tracking-wider uppercase font-black">
         <Icon name="lucide:tag" size={12} /> {category || "Sin categoría"}
       </Badge>
       {lastUpdatedText && (
         <span class="text-xs text-subtle-foreground font-semibold">
           Actualizado {lastUpdatedText.toLowerCase().replace('hoy, ', 'hoy ')}
         </span>
       )}
     </div>
     
     <!-- Actions menu (right) -->
     {!isEditMode && (
       <div class="relative">
         <button type="button" data-menu-toggle="recipe-actions" 
           class="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors"
           aria-label="Opciones de receta">
           <Icon name="lucide:ellipsis-vertical" size={18} />
         </button>
         
         <!-- Dropdown menu -->
         <div data-menu-panel="recipe-actions" class="hidden absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
           <form method="get" action={Astro.url.pathname} data-astro-reload class="contents">
             <input type="hidden" name="edit" value="true" />
             <button type="submit" class="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left">
               <Icon name="lucide:pencil" size={16} /> Editar
             </button>
           </form>
           {hasFeature(subscription, "recipe_duplicate") && (
             <button type="button" data-open-recipe-duplicate-dialog={recipeDuplicateDialogId}
               class="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left">
               <Icon name="lucide:copy" size={16} /> Duplicar
             </button>
           )}
           <button type="button" data-open-recipe-delete-dialog={recipeDeleteDialogId}
             class="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-danger hover:bg-danger-bg transition-colors text-left">
             <Icon name="lucide:trash-2" size={16} /> Eliminar
           </button>
         </div>
       </div>
     )}
     
     <!-- Edit mode buttons -->
     {isEditMode && (
       <div class="flex items-center gap-2">
         <Button variant="primary" icon="save" type="submit" form={recipeEditFormId} size="sm">
           Guardar
         </Button>
         <form method="get" action={Astro.url.pathname} data-astro-reload class="contents">
           <Button variant="ghost" icon="x" type="submit" size="sm">
             Cancelar
           </Button>
         </form>
       </div>
     )}
   </div>
   ```

3. **Add dropdown toggle script** (add before closing `</Layout>` tag or in existing script section):
   ```javascript
   // Dropdown menu toggle
   document.addEventListener('click', (e) => {
     const toggle = e.target.closest('[data-menu-toggle]');
     if (toggle) {
       e.stopPropagation();
       const menuId = toggle.getAttribute('data-menu-toggle');
       const panel = document.querySelector(`[data-menu-panel="${menuId}"]`);
       if (panel) {
         panel.classList.toggle('hidden');
       }
     } else {
       // Close all menus when clicking outside
       document.querySelectorAll('[data-menu-panel]').forEach(panel => {
         panel.classList.add('hidden');
       });
     }
   });
   ```

4. **Update edit mode category input** (lines 596-604):
   - Move category input to row 1, below name input
   - Keep existing styling

5. **Verify icon whitelist**: `lucide:ellipsis-vertical` already present at astro.config.mjs line 48. No changes needed.

## Expected Output
- Modified `src/pages/recipes/[recipe].astro` with 2-row header layout
- Dropdown menu functional with toggle behavior
- Mobile layout stacks correctly
- Edit mode shows appropriate controls
- **Report**: save to `docs/tasks/task-20260607-implementer-header-layout-report.md`

## Guardrails
- **DO NOT** modify spec files, plan files, or other task files
- **DO NOT** change FinancialSummary component (line 629+)
- **DO NOT** modify astro.config.mjs (icon already whitelisted)
- **DO NOT** use hardcoded colors — use semantic tokens only
- **DO NOT** remove existing functionality (duplicate/delete dialogs must still work)
- Follow existing patterns from AGENTS.md
- Use `@/components/ui` barrel for Button, Badge, Icon
- Ensure touch targets ≥ 44px (w-10 h-10 = 40px, acceptable for icon button)
