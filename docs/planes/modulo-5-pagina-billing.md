# Modulo 5: Pagina /settings/billing

## Objetivo

Crear una pagina donde el usuario pueda ver el estado de su suscripcion, gestionarla via Stripe Portal, y ver los limites de su plan.

## Archivo a Crear

### `src/pages/settings/billing.astro`

## Ruta

`/settings/billing` (pagina anidada dentro de settings)

## Frontmatter Logic

```astro
---
import Layout from "../../layouts/Layout.astro";
import { Icon } from "astro-icon/components";
import {
  isPaid,
  isPro,
  getRemainingRecipes,
  getRemainingIngredients,
} from "../../lib/subscription";
import {
  countUserRecipes,
  countUserIngredients,
  getRecipeDataOwner,
} from "../../lib/recipe-data";

if (!Astro.locals.session || !Astro.locals.user) {
  return Astro.redirect("/sign-in");
}

const user = Astro.locals.user;
const subscription = Astro.locals.subscription;
const recipeDataOwner = getRecipeDataOwner(user);

const recipeCount = await countUserRecipes(recipeDataOwner);
const ingredientCount = await countUserIngredients(recipeDataOwner);

const remainingRecipes = getRemainingRecipes(subscription, recipeCount);
const remainingIngredients = getRemainingIngredients(
  subscription,
  ingredientCount,
);

const isSuccess = Astro.url.searchParams.get("success") === "1";
const isCanceled = Astro.url.searchParams.get("canceled") === "1";
---
```

## Secciones de la Pagina

### 1. Header con Breadcrumb

```
Ajustes > Facturacion y Suscripcion
```

Link "Ajustes" debe volver a `/settings`.

### 2. Mensajes de Estado (condicionales)

```astro
<!-- Exito despues de pago -->{
  isSuccess && (
    <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6">
      <div class="flex items-center gap-3">
        <Icon name="lucide:check-circle" size={20} class="text-emerald-600" />
        <div>
          <p class="text-emerald-700 font-semibold">¡Pago exitoso!</p>
          <p class="text-emerald-600 text-sm">
            Tu suscripcion ha sido activada.
          </p>
        </div>
      </div>
    </div>
  )
}

<!-- Alerta de trial -->
{
  subscription.isTrial && subscription.currentPeriodEnd && (
    <div class="bg-accent-50 border border-accent-200 rounded-2xl p-4 mb-6">
      <div class="flex items-center gap-3">
        <Icon name="lucide:clock" size={20} class="text-accent-600" />
        <div>
          <p class="text-accent-700 font-semibold">Periodo de prueba activo</p>
          <p class="text-accent-600 text-sm">
            Tu trial termina el{" "}
            {subscription.currentPeriodEnd.toLocaleDateString("es-MX")}.
          </p>
        </div>
      </div>
    </div>
  )
}

<!-- Alerta de cancelacion proxima -->
{
  subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
      <div class="flex items-center gap-3">
        <Icon name="lucide:alert-triangle" size={20} class="text-amber-600" />
        <div>
          <p class="text-amber-700 font-semibold">Suscripcion cancelada</p>
          <p class="text-amber-600 text-sm">
            Tu plan seguira activo hasta el{" "}
            {subscription.currentPeriodEnd.toLocaleDateString("es-MX")}.
          </p>
        </div>
      </div>
    </div>
  )
}
```

### 3. Tarjeta de Plan Actual

```astro
<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div class="flex items-start justify-between">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        Plan actual
      </p>
      <h2 class="mt-1 text-2xl font-black text-slate-900">
        KitchCalc {
          subscription.tier === "free"
            ? "Free"
            : subscription.tier === "basic"
              ? "Basic"
              : "Pro"
        }
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        {
          subscription.tier === "free"
            ? "Gratis para siempre"
            : subscription.isTrial
              ? "En periodo de prueba de 14 dias"
              : `Renueva ${subscription.billingInterval === "yearly" ? "anualmente" : "mensualmente"}`
        }
      </p>
    </div>

    <div class="text-right">
      {
        subscription.tier !== "free" && (
          <p class="text-2xl font-black text-slate-900">
            ${subscription.tier === "basic" ? "5" : "10"}
            <span class="text-sm font-semibold text-slate-400">/mes</span>
          </p>
        )
      }
      {
        subscription.cancelAtPeriodEnd && (
          <span class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
            Cancelado
          </span>
        )
      }
      {
        subscription.status === "trialing" && (
          <span class="inline-flex items-center rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-700">
            Trial
          </span>
        )
      }
    </div>
  </div>

  <div class="mt-6 flex gap-3">
    {
      subscription.tier !== "pro" && (
        <a
          href="/pricing"
          class="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-bold text-white hover:bg-accent-700 transition-colors"
        >
          <Icon name="lucide:arrow-up-circle" size={16} />
          {subscription.tier === "free" ? "Suscribirse" : "Actualizar a Pro"}
        </a>
      )
    }

    {
      isPaid(subscription) && !subscription.cancelAtPeriodEnd && (
        <button
          type="button"
          id="manage-subscription-btn"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Icon name="lucide:credit-card" size={16} />
          Gestionar suscripcion
        </button>
      )
    }
  </div>
</div>
```

### 4. Uso de Recursos

```astro
<div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Recetas -->
  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm font-bold text-slate-700">Recetas</p>
      <span class="text-xs font-bold text-slate-400"
        >{recipeCount} / {
          remainingRecipes === null ? "∞" : subscription.recipesLimit
        }</span
      >
    </div>
    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        class="h-full bg-accent-500 rounded-full transition-all"
        style={`width: ${remainingRecipes === null ? 0 : Math.min(100, (recipeCount / subscription.recipesLimit!) * 100)}%`}
      >
      </div>
    </div>
    {
      remainingRecipes !== null && remainingRecipes <= 3 && (
        <p class="mt-2 text-xs text-amber-600 font-semibold">
          Te quedan {remainingRecipes} recetas.{" "}
          <a href="/pricing" class="underline">
            Actualizar plan
          </a>
        </p>
      )
    }
  </div>

  <!-- Ingredientes -->
  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm font-bold text-slate-700">Ingredientes</p>
      <span class="text-xs font-bold text-slate-400"
        >{ingredientCount} / {
          remainingIngredients === null ? "∞" : subscription.ingredientsLimit
        }</span
      >
    </div>
    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        class="h-full bg-accent-500 rounded-full transition-all"
        style={`width: ${remainingIngredients === null ? 0 : Math.min(100, (ingredientCount / subscription.ingredientsLimit!) * 100)}%`}
      >
      </div>
    </div>
    {
      remainingIngredients !== null && remainingIngredients <= 5 && (
        <p class="mt-2 text-xs text-amber-600 font-semibold">
          Te quedan {remainingIngredients} ingredientes.{" "}
          <a href="/pricing" class="underline">
            Actualizar plan
          </a>
        </p>
      )
    }
  </div>
</div>
```

### 5. Lista de Features

```astro
<div class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <h3 class="text-sm font-bold text-slate-700 mb-4">Funciones incluidas</h3>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    {
      [
        { key: "recipe_duplicate", label: "Duplicar recetas" },
        { key: "recipe_photos", label: "Fotos de recetas" },
        { key: "stock_tracking", label: "Stock de ingredientes" },
        { key: "production_planner", label: "Planificador de produccion" },
        { key: "pdf_export", label: "Exportar a PDF" },
        { key: "advanced_costs", label: "Costos fijos avanzados" },
        { key: "change_history", label: "Historial de cambios" },
        { key: "data_import_export", label: "Importar/Exportar datos" },
      ].map((feature) => {
        const hasIt = subscription.features[feature.key] === true;
        return (
          <div
            class={`flex items-center gap-2 text-sm ${hasIt ? "text-slate-700" : "text-slate-400"}`}
          >
            <Icon
              name={hasIt ? "lucide:check" : "lucide:x"}
              size={16}
              class={hasIt ? "text-emerald-500" : "text-slate-300"}
            />
            {feature.label}
          </div>
        );
      })
    }
  </div>
</div>
```

## Script para Portal de Stripe

```astro
<script>
  const manageBtn = document.getElementById("manage-subscription-btn");
  if (manageBtn) {
    manageBtn.addEventListener("click", async () => {
      manageBtn.disabled = true;
      manageBtn.innerHTML = "Cargando...";

      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const data = await res.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || "Error al abrir el portal");
        }
      } catch (err) {
        manageBtn.disabled = false;
        manageBtn.innerHTML = "Gestionar suscripcion";
        alert("Error: " + err.message);
      }
    });
  }
</script>
```

## Navegacion desde Settings

En `src/pages/settings.astro`, agregar un link a billing:

```astro
<!-- Agregar despues del form de preferencias -->
<div class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        Suscripcion
      </p>
      <h3 class="mt-1 text-lg font-bold text-slate-900">Facturacion y plan</h3>
      <p class="mt-1 text-sm text-slate-500">
        Gestion tu suscripcion y metodos de pago.
      </p>
    </div>
    <a
      href="/settings/billing"
      class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
    >
      <Icon name="lucide:credit-card" size={16} />
      Gestionar
    </a>
  </div>
</div>
```

## Consideraciones

1. **Layout:** Usar `Layout` con `currentPage="settings"`, `showSideBar={false}`
2. **Auth:** Protegida (redirige a sign-in si no hay sesion)
3. **Datos sensibles:** No mostrar stripe_customer_id ni stripe_subscription_id en UI
4. **Fechas:** Formatear en espanol usando `toLocaleDateString('es-MX')`

## Testing

1. Verificar que la pagina carga correctamente para usuario Free
2. Verificar que la pagina carga correctamente para usuario Basic
3. Verificar que la pagina carga correctamente para usuario Pro
4. Verificar que el boton "Gestionar suscripcion" abre Stripe Portal
5. Verificar que las barras de progreso muestran el uso correcto
6. Verificar mensajes de success/canceled

## Archivos de Salida

- `src/pages/settings/billing.astro` (nuevo)
- `src/pages/settings.astro` (modificado, agregar link a billing)
