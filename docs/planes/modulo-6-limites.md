# Modulo 6: Limites en CRUD

## Objetivo

Validar los limites de recetas e ingredientes al momento de crear nuevos registros, mostrando un modal de upgrade si se alcanza el limite.

## Archivos a Modificar

### 1. `src/pages/recipes/index.astro`

**Cambio:** Antes de crear una receta, verificar que el usuario no ha alcanzado su limite.

**Ubicacion:** En el bloque `if (Astro.request.method === "POST")`, antes de `createRecipe()`.

**Logica a agregar:**
```typescript
import { canCreateRecipe } from "../../lib/subscription";
import { countUserRecipes } from "../../lib/recipe-data";

if (action === "create_recipe") {
  // NUEVO: Verificar limite
  const recipeCount = await countUserRecipes(recipeDataOwner);
  const subscription = Astro.locals.subscription;
  
  if (!canCreateRecipe(subscription, recipeCount)) {
    // Redirigir a la misma pagina con mensaje de error
    const errorUrl = new URL(Astro.url);
    errorUrl.searchParams.set("type", "error");
    errorUrl.searchParams.set("message", `Has alcanzado el limite de ${subscription.recipesLimit} recetas de tu plan Free. Actualiza tu plan para crear mas.`);
    return Astro.redirect(errorUrl.toString());
  }
  
  // ... crear receta
}
```

**UI:** El error se mostrara como un alert en la pagina. Para mejor UX, agregar un modal de upgrade.

### 2. `src/pages/ingredients.astro`

**Cambio:** Antes de crear un ingrediente, verificar que el usuario no ha alcanzado su limite.

**Ubicacion:** En el bloque `if (action === "create")`, antes de `createIngredient()`.

**Logica a agregar:**
```typescript
import { canCreateIngredient } from "../lib/subscription";
import { countUserIngredients } from "../lib/recipe-data";

if (action === "create") {
  // NUEVO: Verificar limite
  const ingredientCount = await countUserIngredients(recipeDataOwner);
  const subscription = Astro.locals.subscription;
  
  if (!canCreateIngredient(subscription, ingredientCount)) {
    return redirectWithFeedback({
      type: "error",
      message: `Has alcanzado el limite de ${subscription.ingredientsLimit} ingredientes de tu plan Free. Actualiza tu plan para crear mas.`,
    });
  }
  
  // ... crear ingrediente
}
```

### 3. `src/pages/recipes/[recipe].astro`

**Cambio:** Limitar la creacion de presentaciones en el plan Free (opcional, puede dejarse para despues ya que presentaciones no estan en el plan de limites).

## Mejora UX: Modal de Upgrade

En vez de solo mostrar un mensaje de error, mostrar un modal que invite al upgrade:

```astro
<!-- En src/pages/recipes/index.astro, agregar dialog -->
<dialog id="upgrade-modal" class="fixed inset-0 m-auto w-[92vw] max-w-md rounded-3xl border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-900/40">
  <div class="rounded-3xl bg-white p-6">
    <div class="flex items-start gap-3">
      <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
        <Icon name="lucide:zap" size={18} />
      </div>
      <div>
        <h2 class="text-lg font-bold text-slate-900">Limite alcanzado</h2>
        <p class="mt-2 text-sm text-slate-600">
          Has alcanzado el limite de {subscription.recipesLimit} recetas en tu plan Free.
        </p>
        <p class="mt-1 text-sm text-slate-500">
          Actualiza a Basic o Pro para crear recetas ilimitadas.
        </p>
      </div>
    </div>
    <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" data-close-upgrade-modal class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
        Entendido
      </button>
      <a href="/pricing" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-700">
        <Icon name="lucide:arrow-up-circle" size={16} />
        Ver planes
      </a>
    </div>
  </div>
</dialog>
```

## Script para Abrir Modal desde URL

```astro
<script>
  // Si hay parametro "upgrade=1" en URL, abrir modal
  const url = new URL(window.location.href);
  if (url.searchParams.get('upgrade') === '1') {
    const modal = document.getElementById('upgrade-modal');
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  }
  
  // Cerrar modal
  document.querySelectorAll('[data-close-upgrade-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById('upgrade-modal');
      if (modal instanceof HTMLDialogElement) {
        modal.close();
      }
    });
  });
</script>
```

## Sidebar: Badge de Plan

En `src/components/RecipesSidebar.astro`, mostrar el tier actual del usuario:

```astro
<!-- Agregar junto al nombre de usuario -->
{isAuthenticated && normalizedUserName && (
  <div class="flex min-w-0 items-center gap-3">
    <div class="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-accent-600 text-sm font-bold text-white shadow-md shadow-accent-100">
      {userInitial}
    </div>
    <div class="min-w-0">
      <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        Sesion activa
      </p>
      <p class="truncate text-base font-bold text-slate-800">
        {normalizedUserName}
      </p>
      <!-- NUEVO: Badge de plan -->
      <span class="inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold text-accent-700 mt-0.5">
        {subscription.tier === 'free' ? 'Free' : subscription.tier === 'basic' ? 'Basic' : 'Pro'}
      </span>
    </div>
  </div>
)}
```

**Nota:** Necesita recibir `subscription` como prop desde `Layout.astro` -> `RecipesSidebar.astro`.

## Header: Badge de Plan (Opcional)

En `src/components/Header.astro`, agregar badge de plan junto al boton de sign-out:

```astro
<!-- Dentro del div con isAuthenticated -->
<div class="flex items-center gap-2">
  <span class="hidden sm:inline-flex items-center rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-700">
    {subscription.tier === 'free' ? 'Free' : subscription.tier === 'basic' ? 'Basic' : 'Pro'}
  </span>
  <button id="sign-out-button">...</button>
</div>
```

**Nota:** Necesita recibir `subscription` como prop.

## Consideraciones

1. **Free tier:** Solo se aplica a usuarios con tier 'free'. Basic y Pro tienen limites null (unlimited).
2. **Mensajes:** Los mensajes deben ser claros y dirigir a `/pricing`.
3. **UX:** No bloquear la edicion de recetas existentes, solo la creacion de nuevas.
4. **Performance:** `countUserRecipes` y `countUserIngredients` son queries rapidas con indice.

## Testing

1. Usuario Free con 9 recetas: puede crear la 10a
2. Usuario Free con 10 recetas: no puede crear mas, muestra modal
3. Usuario Free con 29 ingredientes: puede crear el 30o
4. Usuario Free con 30 ingredientes: no puede crear mas
5. Usuario Basic: puede crear mas de 10 recetas
6. Verificar que el badge de plan aparece en sidebar

## Archivos de Salida

- `src/pages/recipes/index.astro` (modificado)
- `src/pages/ingredients.astro` (modificado)
- `src/components/RecipesSidebar.astro` (modificado, agregar badge)
- `src/components/Header.astro` (modificado opcional)
