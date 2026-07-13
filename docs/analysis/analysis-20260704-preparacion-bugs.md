# Analysis: Bugs en sección de Preparación

**ID**: 20260704-preparacion-bugs
**Scope**: `apps/web/src/components/InstructionsEditor.astro`, `apps/web/src/lib/instructions-parser.ts`, `apps/web/src/styles/global.css`

---

## Issues encontrados

### 1. Listas (numeradas/viñetas) no muestran marcadores en modo edición

**Causa raíz**: `global.css` (lines 367-371) define `.contenteditable-editor ul` y `.contenteditable-editor ol` con `padding-left: 1.5rem` pero **sin `list-style-type`**. Tailwind preflight resetea `list-style: none` en todos los `ul`/`ol`, por lo que los marcadores (números, bullets) no son visibles aunque el padding crea espacio para ellos.

**Fix**: Agregar `list-style-type: disc` a `.contenteditable-editor ul` y `list-style-type: decimal` a `.contenteditable-editor ol`.

### 2. Pasos se muestran incorrectamente en modo lectura con listas HTML

**Causa raíz**: `parseHtmlSteps()` en `instructions-parser.ts` (line 224) usa regex `/<(div|h2|h3|p|ol|ul|li)[^>]*>[\s\S]*?<\/\1>/gi`. Cuando hay una lista como `<ol><li>A</li><li>B</li></ol>`:

1. El regex matchea `<ol>...</ol>` como un paso (lista entera)
2. El regex **también** matchea `<li>A</li>` y `<li>B</li>` como pasos separados

Resultado: contenido duplicado y elementos `<li>` sueltos renderizados como step-cards con número de paso (doble numeración).

**Fix**: Remover `ol`, `ul`, `li` del regex. Las listas deben tratarse como contenido dentro de un paso, no como pasos independientes. Si una lista es el único contenido, el fallback `if (steps.length === 0 && html.trim())` la captura como un solo paso, lo cual es aceptable.

### 3. Divisores (border-y) arriba y abajo del editor

**Causa raíz**: `InstructionsEditor.astro` line 22 usa `<div class="border-border mx-5 border-y py-6 ...">` como wrapper. `border-y` agrega bordes horizontales que actúan como divisores visuales alrededor de todo el editor (toolbar + textarea).

**Fix**: Remover `border-y` del wrapper. Reestructurar para que el editor use card-styling consistente con otros paneles (`bg-card border rounded-2xl`), eliminando los divisores y unificando el look.

### 4. Margen/padding hace que el editor se vea más angosto que el menú superior

**Causa raíz**: El editor usa `mx-5 sm:mx-6 lg:mx-8`, mientras que otros paneles usan `mx-1 sm:mx-2 lg:mx-8`. A 375px (mobile), `mx-5` quita 40px de ancho vs `mx-1` que solo quita 8px, haciendo que el editor se vea notablemente más angosto que la tab bar.

**Fix**: Alinear márgenes con el resto de paneles: `mx-1 mt-6 sm:mx-2 lg:mx-8`.

---

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/styles/global.css` | Agregar `list-style-type` a `.contenteditable-editor ul/ol` |
| `apps/web/src/lib/instructions-parser.ts` | Remover `ol\|ul\|li` del regex en `parseHtmlSteps` |
| `apps/web/src/components/InstructionsEditor.astro` | Remover `border-y`, ajustar márgenes, agregar card-styling |

## Riesgos

- **Bajo**: Cambios puramente cosméticos y de CSS. Sin impacto en datos, auth, o lógica de negocio.
- `parseHtmlSteps` solo se usa en `RecipeInstructions.astro` (modo lectura). El cambio de regex podría alterar cómo se renderizan pasos existentes con HTML complejo, pero solo afecta listas.

## Acceptance criteria

1. En modo edición, al crear una lista numerada se ve el número, y al crear lista con viñetas se ve el punto.
2. En modo lectura, los pasos de una receta con listas HTML se muestran correctamente (sin duplicación ni doble numeración).
3. No hay divisores horizontales arriba/abajo del editor de preparación.
4. El editor de preparación está alineado horizontalmente con la tab bar y demás paneles.
5. `pnpm astro check` pasa sin errores nuevos.
6. `pnpm eslint .` no introduce errores nuevos.
