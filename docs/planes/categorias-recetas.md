# Plan: Categorías de Recetas

> **Prioridad:** 🔴 Crítica  
> **Fecha del plan:** 2026-05-05  
> **Estado actual:** Placeholder en UI (`RecipesSidebar.astro:96` hardcodea `"Sin categoría"`)  
> **Decisión de diseño:** Campo de texto libre `category TEXT` en `recipes` (mismo patrón que `brand`/`supplier` en ingredients). Sin tabla separada de categorías. NULL = "Sin categoría" en UI.

---

## Objetivo

Que cada receta tenga una categoría visible en la sidebar, filtrable, y mostrada como badge en la vista de detalle. Las recetas existentes migran a `"General"`.

---

## 1. Base de datos

### 1.1 Schema — Agregar columna `category` a `recipes`

```sql
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT;
```

### 1.2 Migración en `createTables()` (`src/lib/db/connection.ts`)

**Postgres** — agregar bloque después de la migración de `updated_at`:
```ts
await driver.pool.query(
  "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT"
);
```

**SQLite** — agregar condicional vía `PRAGMA table_info` en la sección de recipeColumns, después del bloque `updated_at`:
```ts
if (!recipeColumns.some((c) => c.name === "category")) {
  driver.db.exec("ALTER TABLE recipes ADD COLUMN category TEXT");
}
```

**Bump `RECIPE_DATA_SCHEMA_VERSION`** de `2` a `3`.

### 1.3 Seed data — `seedIfNeeded()`

Agregar `category` al INSERT de recipes en ambas ramas (Postgres: `$N` adicional; SQLite: `?` adicional).

---

## 2. Tipos (`src/lib/db/types.ts`)

Agregar `category?: string;` a:

| Tipo | Uso |
|------|-----|
| `RecipeSummary` | Sidebar listado |
| `RecipeWithIngredients` | Detalle de receta |
| `CreateRecipeInput` | Creación de receta |
| `UpdateRecipeInput` | Edición de receta |
| `RecipeSeed` | Seed data |

---

## 3. Helpers (`src/lib/db/helpers.ts`)

Agregar:
```ts
export function normalizeCategory(value: unknown): string | null {
  return normalizeOptionalText(value) ?? null;
}
```

---

## 4. Capa de datos (`src/lib/db/recipes.ts`)

### 4.1 `listRecipeSummaries()`

- Agregar `r.category` al SELECT en ambas ramas (Postgres y SQLite).
- Incluir `category` en el objeto retornado (`RecipeSummary`).

### 4.2 `getRecipeById()`

- Agregar `category` al SELECT de recipes.
- Incluir `category` en el objeto retornado.
- Mapear: `row.category` → `recipe.category`.

### 4.3 `createRecipe()`

- Leer `input.category`, normalizar con `normalizeCategory()`.
- Pasar al INSERT en ambas ramas.

### 4.4 `updateRecipe()`

- Agregar `category = ?` al UPDATE.
- Normalizar input y pasar como parámetro.
- Actualizar también `updated_at` (ya se hace).

### 4.5 `connection.ts` — `seedIfNeeded()`

Agregar `category` a los INSERT de recipes en ambas ramas. Leer `recipe.category ?? null` del seed.

---

## 5. Seed data (`data/recipes.json`)

Agregar `"category": "General"` a cada uno de los 7 registros de receta (ids: 101-107).

Ejemplo:
```json
{
  "id": 101,
  "name": "Panqué de Plátano",
  "category": "General",
  "desiredMargin": 50,
  "fixedCostsPercentage": 30,
  "ingredients": [...],
  "presentations": [...]
}
```

---

## 6. UI — Sidebar (`src/components/RecipesSidebar.astro`)

### 6.1 Mostrar categoría real (línea 96)

Cambiar:
```astro
const category = "Sin categoría";
```
Por:
```astro
const category = recipe.category || "Sin categoría";
```

### 6.2 Agregar `data-category` a cada item de receta

```astro
<a
  href={`/recipes/${recipe.id}`}
  class="recipe-item ..."
  data-name={recipe.name.toLowerCase()}
  data-category={recipe.category || ''}
>
```

### 6.3 Filtro por categoría (alcance crítico recomendado)

Agregar `<select>` debajo del search input con opciones dinámicas extraídas de `recipes`:

```astro
<select id="categoryFilter" class="w-full mt-2 ...">
  <option value="">Todas las categorías</option>
  {[...new Set(recipes.map(r => r.category).filter(Boolean))].map(cat => (
    <option value={cat}>{cat}</option>
  ))}
</select>
```

JS de filtrado (extender el event listener existente):
```js
const categoryFilter = document.getElementById('categoryFilter');
if (categoryFilter) {
  categoryFilter.addEventListener('change', () => {
    const cat = categoryFilter.value;
    recipeItems.forEach(item => {
      const itemCat = item.getAttribute('data-category') || '';
      const matchesCat = !cat || itemCat === cat;
      // Combinar con filtro de búsqueda existente
    });
  });
}
```

---

## 7. UI — Detalle de Receta (`src/pages/recipes/[recipe].astro`)

### 7.1 Badge de categoría (líneas 460-463)

Cambiar:
```astro
<span class="flex items-center gap-1.5 bg-accent-50 text-accent-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
  <Icon name="lucide:tag" size={12} /> [Categoría]
</span>
```

Por:
```astro
<span class="flex items-center gap-1.5 bg-accent-50 text-accent-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
  <Icon name="lucide:tag" size={12} /> {recipe.category || "Sin categoría"}
</span>
```

### 7.2 Modo edición — Input de categoría

Agregar campo editable en el header (junto a `recipeName`):
```astro
{isEditMode && (
  <div class="mt-2">
    <input
      type="text"
      name="category"
      form={recipeEditFormId}
      class="w-full max-w-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-accent-500/20"
      value={recipe.category || ''}
      placeholder="Categoría (ej. Panes, Galletas, Pasteles)"
    />
  </div>
)}
```

### 7.3 POST handler (`action === 'update_recipe'`)

Después de leer `fixedCostsPercentage`:
```ts
const category = String(formData.get('category') || '').trim() || null;
```

Agregar al objeto de input:
```ts
await updateRecipe(recipeIdNumber, {
  name,
  category,
  desiredMargin,
  fixedCostsPercentage,
  ingredients: ingredientsToSave,
}, recipeDataOwner);
```

---

## 8. Verificación

- [ ] Las recetas seed muestran "General" en sidebar y badge
- [ ] Recetas nuevas sin categoría muestran "Sin categoría"
- [ ] Editar categoría desde modo edición persiste al guardar
- [ ] Filtro por categoría en sidebar oculta/muestra recetas correctamente
- [ ] La migración aplica sin errores en Postgres (`ALTER TABLE ADD COLUMN IF NOT EXISTS`)
- [ ] La migración aplica sin errores en SQLite (`PRAGMA table_info` + `ALTER TABLE`)
- [ ] `listRecipeSummaries` no se rompe para recetas con `category = NULL`

---

## 9. Archivos modificados (resumen)

| Archivo | Cambio |
|---------|--------|
| `src/lib/db/connection.ts` | Migration SQL + bump schema version + seed insert |
| `src/lib/db/types.ts` | `category?: string` en 5 tipos |
| `src/lib/db/helpers.ts` | `normalizeCategory()` |
| `src/lib/db/recipes.ts` | 4 funciones: SELECT/INSERT/UPDATE con category |
| `data/recipes.json` | `"category": "General"` en 7 recetas |
| `src/components/RecipesSidebar.astro` | category dinámica + filtro |
| `src/pages/recipes/[recipe].astro` | Badge + input edit + POST handler |
