# Modulo 7: UpgradePrompt Component

## Objetivo

Crear un componente reutilizable que muestre un CTA (Call to Action) cuando un usuario intenta acceder a una feature bloqueada por su plan.

## Archivo a Crear

### `src/components/UpgradePrompt.astro`

## Props

```typescript
interface Props {
  feature: string; // Nombre legible de la feature (ej: "Exportar a PDF")
  description?: string; // Descripcion opcional
  tier: "basic" | "pro"; // Plan minimo requerido
}
```

## Estructura Visual

```
┌─────────────────────────────────────────┐
│                                         │
│   [Icono lucide:lock]                   │
│                                         │
│   Funcion no disponible                 │
│   "Exportar a PDF" requiere             │
│   el plan Pro o superior.               │
│                                         │
│   [Suscribirse a Pro]  [No gracias]     │
│                                         │
└─────────────────────────────────────────┘
```

## Implementacion

```astro
---
import { Icon } from "astro-icon/components";

interface Props {
  feature: string;
  description?: string;
  tier: "basic" | "pro";
}

const { feature, description, tier } = Astro.props;

const tierLabel = tier === "pro" ? "Pro" : "Basic";
const price = tier === "pro" ? "$10/mes" : "$5/mes";
---

<div class="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
  <div
    class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"
  >
    <Icon name="lucide:lock" size={20} />
  </div>

  <h3 class="mt-4 text-lg font-bold text-slate-900">Funcion no disponible</h3>

  <p class="mt-2 text-sm text-slate-600">
    {description || `"${feature}" requiere el plan ${tierLabel} o superior.`}
  </p>

  <p class="mt-1 text-sm text-slate-500">
    Desde {price} puedes acceder a esta y muchas otras funciones.
  </p>

  <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
    <button
      type="button"
      class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
      onclick="this.closest('dialog')?.close()"
    >
      No gracias
    </button>
    <a
      href={`/pricing?plan=${tier}`}
      class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-700"
    >
      <Icon name="lucide:arrow-up-circle" size={16} />
      Suscribirse a {tierLabel}
    </a>
  </div>
</div>
```

## Uso en Paginas

### Ejemplo 1: Bloquear feature inline

```astro
---
import UpgradePrompt from "../components/UpgradePrompt.astro";
import { hasFeature } from "../lib/subscription";

const subscription = Astro.locals.subscription;
const canExportPdf = hasFeature(subscription, "pdf_export");
---

{
  canExportPdf ? (
    <button>Exportar PDF</button>
  ) : (
    <UpgradePrompt feature="Exportar a PDF" tier="pro" />
  )
}
```

### Ejemplo 2: Dentro de un dialog

```astro
---
import UpgradePrompt from "../components/UpgradePrompt.astro";
---

<dialog id="pdf-export-dialog">
  <UpgradePrompt
    feature="Exportar a PDF"
    description="Genera fichas de costeo y tarjetas de receta en formato PDF para compartir con clientes."
    tier="pro"
  />
</dialog>

<script>
  document.getElementById("export-pdf-btn")?.addEventListener("click", () => {
    document.getElementById("pdf-export-dialog")?.showModal();
  });
</script>
```

### Ejemplo 3: Bloquear seccion completa

```astro
---
import UpgradePrompt from "../components/UpgradePrompt.astro";
import { hasFeature } from "../lib/subscription";

const subscription = Astro.locals.subscription;
const canUsePlanner = hasFeature(subscription, "production_planner");
---

{
  canUsePlanner ? (
    <ProductionPlanner />
  ) : (
    <div class="max-w-md mx-auto">
      <UpgradePrompt
        feature="Planificador de produccion"
        description="Planifica corridas de produccion multi-receta, calcula insumos consolidados y genera listas de compra."
        tier="pro"
      />
    </div>
  )
}
```

## Uso en API Routes

Para endpoints que requieren una feature especifica:

```typescript
import type { APIRoute } from "astro";
import { hasFeature } from "../../lib/subscription";

export const POST: APIRoute = async ({ locals }) => {
  const { subscription } = locals;

  if (!hasFeature(subscription, "production_planner")) {
    return new Response(
      JSON.stringify({
        error: "Feature not available",
        requiredTier: "pro",
        upgradeUrl: "/pricing?plan=pro",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // ... procesar
};
```

## Variantes Visuales

### Compacta (para listas)

```astro
<!-- Variant compact -->
<div
  class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
>
  <Icon name="lucide:lock" size={16} class="text-slate-400" />
  <p class="text-sm text-slate-600 flex-1">{feature} - Requiere {tierLabel}</p>
  <a
    href="/pricing"
    class="text-sm font-bold text-accent-600 hover:text-accent-700"
    >Actualizar</a
  >
</div>
```

### Banner (para top de pagina)

```astro
<!-- Variant banner -->
<div
  class="flex items-center justify-between rounded-xl bg-accent-50 border border-accent-200 px-4 py-3"
>
  <div class="flex items-center gap-2">
    <Icon name="lucide:zap" size={16} class="text-accent-600" />
    <p class="text-sm text-accent-700">
      Desbloquea <strong>{feature}</strong> con el plan {tierLabel}
    </p>
  </div>
  <a
    href="/pricing"
    class="text-sm font-bold text-accent-600 hover:text-accent-700"
    >Ver planes</a
  >
</div>
```

## Consideraciones

1. **Reutilizabilidad:** El componente debe funcionar tanto inline como dentro de un dialog
2. **URL params:** Al redirigir a `/pricing`, agregar `?plan=basic` o `?plan=pro` para pre-seleccionar
3. **Cierre:** El boton "No gracias" debe cerrar el dialog padre si existe
4. **Estilos:** Seguir convenciones del proyecto (accent-\*, rounded-2xl, etc.)

## Testing

1. Renderizar componente con feature="Exportar a PDF" tier="pro"
2. Verificar que el boton redirige a `/pricing?plan=pro`
3. Verificar que funciona dentro de un `<dialog>`
4. Verificar que se ve bien en mobile

## Archivos de Salida

- `src/components/UpgradePrompt.astro` (nuevo)
