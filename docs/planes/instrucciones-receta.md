# Plan: Instrucciones / Pasos de Preparación

> **Prioridad:** 🔴 Crítica  
> **Fecha del plan:** 2026-05-05  
> **Estado actual:** No implementado. Las recetas solo tienen ingredientes y costos.  
> **Decisión de diseño:** Campo `instructions TEXT` en `recipes` con renderizado Markdown vía `marked`. No tabla separada `recipe_steps` en v1.

---

## Objetivo

Agregar una sección de "Preparación" a cada receta con el procedimiento paso a paso. El campo es Markdown, renderizado server-side en vista y editable con `<textarea>` en modo edición. Recetas sin instrucciones no muestran la sección (o muestran placeholder).

---

## 1. Base de datos

### 1.1 Schema — Agregar columna `instructions` a `recipes`

```sql
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions TEXT;
```

### 1.2 Migración en `createTables()` (`src/lib/db/connection.ts`)

**Postgres** — agregar bloque:
```ts
await driver.pool.query(
  "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions TEXT"
);
```

**SQLite** — agregar después del bloque `category`:
```ts
if (!recipeColumns.some((c) => c.name === "instructions")) {
  driver.db.exec("ALTER TABLE recipes ADD COLUMN instructions TEXT");
}
```

**Bump `RECIPE_DATA_SCHEMA_VERSION`:** Si se implementa junto con categorías → 2→3. Si categorías ya está en 3 → 3→4.

### 1.3 Seed data — `seedIfNeeded()`

Agregar `instructions` al INSERT de recipes en ambas ramas. Leer `recipe.instructions ?? null` del seed.

---

## 2. Tipos (`src/lib/db/types.ts`)

Agregar `instructions?: string;` a:

| Tipo | Uso |
|------|-----|
| `RecipeWithIngredients` | Detalle de receta (vista) |
| `UpdateRecipeInput` | Edición de receta |
| `RecipeSeed` | Seed data |

No se necesita en `RecipeSummary` ni `CreateRecipeInput` (las instrucciones no se muestran en sidebar ni se piden al crear).

---

## 3. Helpers (`src/lib/db/helpers.ts`)

No se necesita helper nuevo. Usar `normalizeOptionalText()` existente:
- `undefined` = no hay instrucciones
- `string` = se renderiza

---

## 4. Capa de datos (`src/lib/db/recipes.ts`)

### 4.1 `getRecipeById()`

Agregar `instructions` al SELECT de recipes en ambas ramas. Incluir en el objeto retornado. Postgres: mapear de `row.instructions`. SQLite: tomar de `recipe.instructions`.

### 4.2 `updateRecipe()`

Agregar `instructions = ?` al UPDATE SQL. Normalizar con `normalizeOptionalText()`:
```ts
const instructions = normalizeOptionalText(input.instructions) ?? null;
```

### 4.3 `connection.ts` — `seedIfNeeded()`

Agregar `instructions` a los INSERT de recipes en ambas ramas:
- Postgres: agregar `$N` al VALUES + parámetro
- SQLite: agregar `?` al VALUES + parámetro

---

## 5. Seed data (`data/recipes.json`)

Agregar `instructions` de ejemplo a recetas representativas, o `null`. Formato sugerido — pasos numerados con Markdown:

Para Panqué de Plátano:
```json
"instructions": "1. Precalentar el horno a 180°C (350°F).\n2. En un tazón grande, machacar los plátanos maduros con un tenedor.\n3. Agregar los huevos, el aceite/esencia de vainilla, y la leche. Batir bien.\n4. En otro tazón, mezclar la harina, el polvo para hornear, el bicarbonato, la canela y la sal.\n5. Incorporar los ingredientes secos a los húmedos, mezclando solo hasta integrar.\n6. Agregar las chispas de chocolate (opcional) y envolver suavemente.\n7. Verter en molde engrasado y hornear por 45-50 minutos, o hasta que al insertar un palillo salga limpio.\n8. Dejar enfriar 10 minutos, desmoldar y enfriar completamente sobre una rejilla."
```

---

## 6. Instalar dependencia

```bash
pnpm add marked
```

---

## 7. UI — Sección Preparación (`src/pages/recipes/[recipe].astro`)

### 7.1 Ubicación

Nueva sección entre el card de ingredientes y `#presentaciones`. Colocar después del cierre de `</div>` del card de ingredientes (línea ~845) y antes del `<div id="presentaciones">` (línea ~850).

### 7.2 Estado vacío (sin instrucciones, modo vista)

No mostrar la sección para mantener la UI limpia (mismo patrón que `comment` en ingredientes).

### 7.3 Vista renderizada

```astro
{
  recipe.instructions && (
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mx-1 sm:mx-2 lg:mx-8 mt-6">
      <div class="px-5 sm:px-6 lg:px-8 py-5 border-b border-slate-100">
        <h2 class="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Icon name="lucide:list-checks" size={16} class="text-accent-500" />
          Preparación
        </h2>
      </div>
      <div
        class="px-5 sm:px-6 lg:px-8 py-6 recipe-instructions text-sm leading-relaxed text-slate-700"
        set:html={marked.parse(recipe.instructions, { breaks: true })}
      />
    </div>
  )
}
```

Importar `marked` en el frontmatter:
```ts
import { marked } from "marked";
```

### 7.4 Modo edición

Dentro del bloque `{isEditMode && ( ... )}` que envuelve el formulario de edición, agregar debajo del editor de ingredientes:

```astro
<div class="mt-6 mx-5 sm:mx-6 lg:mx-8 pb-6">
  <label class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
    <Icon name="lucide:list-checks" size={16} class="text-accent-500" />
    Instrucciones de Preparación
  </label>
  <textarea
    name="instructions"
    form={recipeEditFormId}
    rows={10}
    class="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 font-mono leading-relaxed focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-y transition-colors placeholder:text-slate-400"
    placeholder={`1. Precalentar el horno a 180°C.\n2. Mezclar ingredientes secos.\n3. ...`}
  >{recipe.instructions || ''}</textarea>
  <p class="mt-2 text-xs text-slate-400 leading-relaxed">
    Escribe un paso por línea. Puedes usar Markdown básico (negritas, listas, etc.).
  </p>
</div>
```

### 7.5 POST handler (`action === 'update_recipe'`)

Después de leer `category` (si existe) o de fixedCostsPercentage:
```ts
const instructions = String(formData.get('instructions') || '').trim() || undefined;
```

Agregar al objeto de input:
```ts
await updateRecipe(recipeIdNumber, {
  name,
  desiredMargin,
  fixedCostsPercentage,
  instructions,
  ingredients: ingredientsToSave,
}, recipeDataOwner);
```

Nota: `updateRecipe` debe manejar `instructions` opcional (`undefined` = no cambiar).

---

## 8. Estilos (`src/styles/global.css`)

Agregar estilos base para el contenido renderizado de Markdown. Tailwind typography plugin no está instalado, usar estilos manuales mínimos:

```css
.recipe-instructions ol {
  list-style-type: decimal;
  padding-left: 1.25rem;
}

.recipe-instructions li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.recipe-instructions li::marker {
  font-weight: 700;
  color: var(--accent-500);
}

.recipe-instructions p {
  margin-bottom: 0.75rem;
}

.recipe-instructions strong {
  font-weight: 700;
  color: #1e293b;
}

.recipe-instructions ul {
  list-style-type: disc;
  padding-left: 1.25rem;
}
```

---

## 9. Verificación

- [ ] Recetas con `instructions` muestran la sección "Preparación" con Markdown renderizado
- [ ] Recetas sin `instructions` no muestran la sección (UI limpia)
- [ ] Modo edición: textarea se muestra con contenido existente
- [ ] Guardar instrucciones desde modo edición persiste correctamente
- [ ] Markdown: listas numeradas, negritas, párrafos se renderizan correctamente
- [ ] `marked.parse()` con `{ breaks: true }` convierte saltos de línea en `<br>`
- [ ] La migración aplica sin errores en Postgres
- [ ] La migración aplica sin errores en SQLite
- [ ] `updateRecipe` funciona correctamente con y sin `instructions`
- [ ] Seed data con instrucciones de ejemplo se carga correctamente

---

## 10. Archivos modificados (resumen)

| Archivo | Cambio |
|---------|--------|
| `src/lib/db/connection.ts` | Migration SQL + bump schema version + seed insert |
| `src/lib/db/types.ts` | `instructions?: string` en 3 tipos |
| `src/lib/db/recipes.ts` | `getRecipeById` SELECT + `updateRecipe` SET |
| `data/recipes.json` | `"instructions"` en recetas seed |
| `package.json` | Dependencia `marked` |
| `src/pages/recipes/[recipe].astro` | Nueva sección Preparación + textarea edit + POST handler |
| `src/styles/global.css` | Estilos `.recipe-instructions` (ol, li, p, strong) |
