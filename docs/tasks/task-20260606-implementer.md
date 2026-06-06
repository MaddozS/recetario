# Task: Implementar Breadcrumb Global en Header
Agent: implementer
Date: 2026-06-06
Analysis: docs/analysis/analysis-20260606-breadcrumb-global-header.md
Plan: docs/plans/plan-20260606-breadcrumb-global-header.md

## Goal
Mover breadcrumb de recipes/[recipe].astro al Header global, hacerlo funcional en todas las páginas con soporte mobile/desktop.

## Context
El breadcrumb actualmente solo existe en recipes/[recipe].astro. Debe moverse al Header para que todas las páginas autenticadas lo muestren. En mobile debe mostrar flecha back + label compacta. En desktop, breadcrumb completo con chevron separators.

### Estructura de datos
```ts
// Definir en Header.astro frontmatter
type BreadcrumbItem = { label: string; href?: string }
```

### Prop flow
Layout acepta nuevo prop opcional `breadcrumbs?: BreadcrumbItem[]`.
Layout pasa `breadcrumbs` a Header.
Header usa `breadcrumbs` para renderizar.

### Comportamiento esperado por página

| Página | Breadcrumb array |
|--------|-----------------|
| recipes/index.astro | `[{ label: "Recetas" }]` |
| recipes/[recipe].astro | `[{ label: "Recetas", href: "/recipes" }, { label: recipe.name }]` |
| ingredients.astro | `[{ label: "Ingredientes" }]` |
| settings.astro | `[{ label: "Configuración" }]` |
| settings/billing.astro | `[{ label: "Configuración", href: "/settings" }, { label: "Facturación" }]` |
| produccion.astro | `[{ label: "Planificador de Producción" }]` |
| pricing.astro | `[{ label: "Planes y Precios" }]` |
| 404.astro | Sin breadcrumb |

### Mobile vs Desktop

**Mobile (< md breakpoint)**:
- Si breadcrumbs tiene > 0 items Y el primer item tiene href: mostrar flecha chevron-left + label del último item con href (el padre). El logo se oculta.
- Si breadcrumbs tiene 1 item sin href (top-level): mostrar flecha chevron-left + label. El logo se oculta.
- Si NO hay breadcrumbs: comportamiento actual (logo visible).
- La flecha es un link al href del penúltimo item (o al único si solo hay uno con href).

**Desktop (>= md breakpoint)**:
- Logo visible + breadcrumb completo + sign-out
- Items separados por chevron-right icons
- Último item: `text-foreground font-semibold truncate max-w-[200px]` (no link si no tiene href)
- Items previos: `text-muted-foreground hover:text-secondary-foreground font-medium transition-colors` (links si tienen href)

## Skills Required
- **ui-ux-pro-max**: Para decisiones de diseño responsive y accesibilidad

## Files Involved
- `src/components/Header.astro`: modify — add breadcrumbs prop, render breadcrumb
- `src/layouts/Layout.astro`: modify — accept breadcrumbs prop, pass to Header
- `src/pages/recipes/index.astro`: modify — add breadcrumbs prop to Layout
- `src/pages/recipes/[recipe].astro`: modify — add breadcrumbs prop + remove inline breadcrumb
- `src/pages/ingredients.astro`: modify — add breadcrumbs prop to Layout
- `src/pages/settings.astro`: modify — add breadcrumbs prop to Layout
- `src/pages/settings/billing.astro`: modify — add breadcrumbs prop to Layout
- `src/pages/produccion.astro`: modify — add breadcrumbs prop to Layout
- `src/pages/pricing.astro`: modify — add breadcrumbs prop to Layout

## Technical Steps

1. **Load skill**: ui-ux-pro-max

2. **Define BreadcrumbItem type** in `src/components/Header.astro` frontmatter:
```ts
export type BreadcrumbItem = { label: string; href?: string }
```

3. **Modify `src/components/Header.astro`**:
   - Add `breadcrumbs?: BreadcrumbItem[]` to props destructuring (default `[]`)
   - On mobile, if breadcrumbs.length > 0, replace title div with breadcrumb back-nav.
   - On desktop, insert breadcrumb between logo area and sign-out area.
   - Structure for mobile breadcrumb:
     ```html
     {breadcrumbs.length > 0 && (
       <nav aria-label="Breadcrumb" class="flex items-center gap-1 min-w-0 md:hidden">
         <a href={parentHref} class="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-secondary-foreground transition-colors min-h-11">
           <Icon name="lucide:chevron-left" size={16} />
           <span class="truncate">{parentLabel}</span>
         </a>
       </nav>
     )}
     ```
   - Structure for desktop breadcrumb:
     ```html
     {breadcrumbs.length > 0 && (
       <nav aria-label="Breadcrumb" class="hidden md:flex items-center gap-1.5 text-sm min-w-0">
         {breadcrumbs.map((item, i) => (
           <>
             {i > 0 && <Icon name="lucide:chevron-right" size={14} class="text-subtle-foreground shrink-0" />}
             {item.href ? (
               <a href={item.href} class="text-muted-foreground hover:text-secondary-foreground font-medium transition-colors whitespace-nowrap">
                 {item.label}
               </a>
             ) : (
               <span class="text-foreground font-semibold truncate max-w-[200px]">{item.label}</span>
             )}
           </>
         ))}
       </nav>
     )}
     ```
   - When breadcrumbs present on mobile: hide logo+title (`hidden md:flex` / `hidden md:block`), show breadcrumb nav instead
   - Compute `parentHref` and `parentLabel` from breadcrumbs:
     ```ts
     const parentItem = breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2] : breadcrumbs[0];
     const parentLabel = parentItem?.label ?? '';
     const parentHref = parentItem?.href ?? '';
     ```

4. **Modify `src/layouts/Layout.astro`**:
   - Add `breadcrumbs` to props destructuring: `const { breadcrumbs } = Astro.props;` (or inline in existing destructure)
   - Pass `breadcrumbs={breadcrumbs}` to `<Header>`

5. **Update each page** to pass breadcrumbs to Layout:
   - **recipes/index.astro** (line 113): `<Layout currentPage="recipes" showSideBar={true} breadcrumbs={[{ label: "Recetas" }]}>`
   - **recipes/[recipe].astro** (line 463): `<Layout currentRecipe={id} showSideBar={true} currentPage="recipes" breadcrumbs={[{ label: "Recetas", href: "/recipes" }, { label: name }]}>` AND remove the inline breadcrumb block (lines 548-558 — the `<nav aria-label="Breadcrumb">` element inside the breadcrumb+actions wrapper div). Keep the action buttons block intact, just remove the `<nav>` element from the wrapper.
   - **ingredients.astro** (line 255): `<Layout currentPage="ingredients" showSideBar={true} breadcrumbs={[{ label: "Ingredientes" }]}>`
   - **settings.astro** (line 105): `<Layout currentPage="settings" showSideBar={true} breadcrumbs={[{ label: "Configuración" }]}>`
   - **settings/billing.astro** (line 35): `<Layout currentPage="settings" showSideBar={true} breadcrumbs={[{ label: "Configuración", href: "/settings" }, { label: "Facturación" }]}>`
   - **produccion.astro** (line 100): add `breadcrumbs={[{ label: "Planificador de Producción" }]}` to the Layout opening tag
   - **pricing.astro** (line 27): `<Layout currentPage="pricing" showSideBar={true} breadcrumbs={[{ label: "Planes y Precios" }]}>`

6. **Run verification**: `pnpm astro check` — must pass. Fix any type errors.

7. **Write report** to `docs/tasks/task-20260606-implementer-report.md`:
   - List all files modified
   - Show key changes (mobile HTML structure, desktop HTML structure)
   - Note `pnpm astro check` result
   - Note any issues encountered

## Expected Output
- Modified src/components/Header.astro with breadcrumbs rendering
- Modified src/layouts/Layout.astro passing breadcrumbs to Header
- Modified 7 page files passing breadcrumbs arrays to Layout
- Removed inline breadcrumb from src/pages/recipes/[recipe].astro
- Report at docs/tasks/task-20260606-implementer-report.md

## Guardrails
- IMMUTABLE: Never modify spec files, plan files, or other task files
- Use semantic tokens only (text-muted-foreground, text-foreground, text-secondary-foreground, text-subtle-foreground)
- Use Icon from astro-icon with `lucide:chevron-left` and `lucide:chevron-right`
- Follow existing transition patterns (transition-colors, 150ms)
- Maintain min-h-11 for touch targets on mobile back button
- Do NOT use hardcoded colors
- Spanish labels only
- Do not change LandingLayout or public pages (sign-in, sign-up, etc.)
