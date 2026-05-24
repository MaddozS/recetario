# Modulo 4: Pagina /pricing

## Objetivo

Crear una pagina de comparativa de planes que permita a los usuarios elegir y suscribirse.

## Archivo a Crear

### `src/pages/pricing.astro`

## Estructura Visual

La pagina debe mostrar 3 cards horizontales (o vertical en mobile):

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     FREE        │  │     BASIC       │  │      PRO        │
│                 │  │   (recomendado) │  │   (mas popular) │
│   $0/mes        │  │    $5/mes       │  │    $10/mes      │
│                 │  │   $48/anual     │  │   $84/anual     │
│                 │  │                 │  │                 │
│ ✓ 10 recetas    │  │ ✓ 75 recetas    │  │ ✓ Ilimitadas   │
│ ✓ 30 ingredientes│ │ ✓ Ilimitados    │  │ ✓ Ilimitados    │
│ ✓ Costeo basico │  │ ✓ Duplicar      │  │ ✓ Todo de Basic │
│                 │  │ ✓ Fotos         │  │ ✓ Planificador  │
│                 │  │ ✓ Stock         │  │ ✓ Exportar PDF  │
│                 │  │                 │  │ ✓ Costos avanz. │
│                 │  │                 │  │                 │
│  [Actual]       │  │ [Suscribirse]   │  │ [Suscribirse]   │
│  (si es free)   │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Frontmatter Logic

```astro
---
import Layout from "../layouts/Layout.astro";
import { Icon } from "astro-icon/components";
import { isPaid, isPro } from "../lib/subscription";

// Si el usuario no esta autenticado, redirigir a sign-in
// (o mostrar pagina publica con CTA a sign-in)
if (!Astro.locals.session || !Astro.locals.user) {
  return Astro.redirect("/sign-in");
}

const subscription = Astro.locals.subscription;
const isCurrentFree = subscription.tier === "free";
const isCurrentBasic = subscription.tier === "basic";
const isCurrentPro = subscription.tier === "pro";

// Stripe Price IDs desde env
const priceIds = {
  basicMonthly:
    import.meta.env.STRIPE_PRICE_ID_BASIC_MONTHLY ||
    process.env.STRIPE_PRICE_ID_BASIC_MONTHLY,
  basicYearly:
    import.meta.env.STRIPE_PRICE_ID_BASIC_YEARLY ||
    process.env.STRIPE_PRICE_ID_BASIC_YEARLY,
  proMonthly:
    import.meta.env.STRIPE_PRICE_ID_PRO_MONTHLY ||
    process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
  proYearly:
    import.meta.env.STRIPE_PRICE_ID_PRO_YEARLY ||
    process.env.STRIPE_PRICE_ID_PRO_YEARLY,
};
---
```

## Features por Plan (Datos Estaticos)

```typescript
const plans = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    description: "Para empezar a costear",
    features: [
      { text: "Hasta 10 recetas", included: true },
      { text: "Hasta 30 ingredientes", included: true },
      { text: "Costeo basico con margenes", included: true },
      { text: "Categorias e instrucciones", included: true },
      { text: "Duplicar recetas", included: false },
      { text: "Fotos de recetas", included: false },
      { text: "Stock de ingredientes", included: false },
      { text: "Planificador de produccion", included: false },
      { text: "Exportar a PDF", included: false },
      { text: "Costos fijos avanzados", included: false },
      { text: "Historial de cambios", included: false },
      { text: "Importar/Exportar datos", included: false },
      { text: "Informacion nutricional", included: false },
    ],
  },
  {
    id: "basic",
    name: "Basic",
    priceMonthly: 5,
    priceYearly: 48,
    description: "Para negocios en crecimiento",
    features: [
      { text: "Hasta 75 recetas", included: true },
      { text: "Ingredientes ilimitados", included: true },
      { text: "Costeo basico con margenes", included: true },
      { text: "Categorias e instrucciones", included: true },
      { text: "Duplicar recetas", included: true },
      { text: "Fotos de recetas (1 por receta)", included: true },
      { text: "Stock de ingredientes", included: true },
      { text: "Planificador de produccion (hasta 3 recetas)", included: true },
      { text: "Exportar a PDF", included: false },
      { text: "Costos fijos avanzados", included: false },
      { text: "Historial de cambios", included: false },
      { text: "Importar/Exportar datos", included: false },
      { text: "Informacion nutricional", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 10,
    priceYearly: 84,
    description: "Para profesionales",
    features: [
      { text: "Recetas ilimitadas", included: true },
      { text: "Ingredientes ilimitados", included: true },
      { text: "Costeo basico con margenes", included: true },
      { text: "Categorias e instrucciones", included: true },
      { text: "Duplicar recetas", included: true },
      { text: "Fotos de recetas + galeria", included: true },
      { text: "Stock de ingredientes", included: true },
      { text: "Planificador de produccion ilimitado", included: true },
      { text: "Exportar a PDF", included: true },
      { text: "Costos fijos avanzados", included: true },
      { text: "Historial de cambios", included: true },
      { text: "Importar/Exportar datos", included: true },
      { text: "Informacion nutricional", included: true },
    ],
  },
];
```

## Toggle Mensual/Anual

Implementar un toggle que muestre precios mensuales o anuales:

```astro
<div class="mb-8 flex justify-center">
  <div class="inline-flex rounded-xl bg-slate-100 p-1">
    <button
      type="button"
      id="billing-monthly"
      class="rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow-sm"
      >Mensual</button
    >
    <button
      type="button"
      id="billing-yearly"
      class="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500"
      >Anual <span class="text-xs text-emerald-600">-20%</span></button
    >
  </div>
</div>
```

## Boton de Suscripcion

Cada card tiene un boton que llama al endpoint de checkout:

```astro
<button
  type="button"
  data-price-id={priceId}
  data-plan-name={plan.name}
  class="..."
  disabled={isCurrentPlan}
>
  {isCurrentPlan ? "Plan actual" : "Suscribirse"}
</button>
```

**Script:**

```typescript
document.querySelectorAll("[data-price-id]").forEach((button) => {
  button.addEventListener("click", async () => {
    const priceId = button.dataset.priceId;
    const successUrl = `${window.location.origin}/settings/billing?success=1`;
    const cancelUrl = `${window.location.origin}/pricing?canceled=1`;

    button.disabled = true;
    button.textContent = "Redirigiendo...";

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, successUrl, cancelUrl }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      button.disabled = false;
      button.textContent = "Suscribirse";
      alert("Error: " + err.message);
    }
  });
});
```

## Estilos

Seguir convenciones del proyecto:

- Cards: `rounded-2xl`, `bg-white`, `border border-slate-200`, `shadow-sm`
- Boton primary: `bg-accent-600 text-white hover:bg-accent-700`
- Boton secondary: `border border-slate-200 text-slate-600 hover:bg-slate-50`
- Badge "Popular": `bg-accent-600 text-white text-xs font-bold uppercase`
- Features incluidas: `text-slate-700` con icono lucide:check (accent-600)
- Features no incluidas: `text-slate-400` con icono lucide:x

## Estados de Usuario Logueado

| Estado | Boton Free                                | Boton Basic                   | Boton Pro          |
| ------ | ----------------------------------------- | ----------------------------- | ------------------ |
| Free   | "Plan actual"                             | "Suscribirse"                 | "Suscribirse"      |
| Basic  | "Plan actual" (deshabilitado visualmente) | "Plan actual"                 | "Actualizar a Pro" |
| Pro    | "Plan actual" (deshabilitado)             | "Plan actual" (deshabilitado) | "Plan actual"      |

## Respuesta a Parametros URL

```astro
<!-- Mensaje de exito despues de pago -->{
  Astro.url.searchParams.get("success") === "1" && (
    <div class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p class="font-semibold text-emerald-700">¡Suscripcion activada!</p>
      <p class="text-sm text-emerald-600">
        Tu plan ya esta activo. Disfruta de todas las funciones.
      </p>
    </div>
  )
}

<!-- Mensaje de cancelacion -->
{
  Astro.url.searchParams.get("canceled") === "1" && (
    <div class="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p class="font-semibold text-amber-700">Suscripcion cancelada</p>
      <p class="text-sm text-amber-600">
        No se realizo ningun cargo. Puedes intentarlo de nuevo cuando quieras.
      </p>
    </div>
  )
}
```

## Consideraciones

1. **Layout:** Usar `Layout` sin sidebar (`showSideBar={false}`)
2. **Auth:** La pagina puede ser publica (no requiere auth) mostrando CTA a sign-in, o protegida
3. **Responsive:** En mobile, las cards deben apilarse verticalmente
4. **SEO:** Agregar meta descripcion

## Testing

1. Verificar que los 3 planes se muestran correctamente
2. Verificar que el toggle mensual/anual funciona
3. Verificar que el boton de suscripcion redirige a Stripe
4. Verificar que un usuario Basic ve "Plan actual" en Basic y "Actualizar" en Pro
5. Verificar mensajes de success/canceled

## Archivos de Salida

- `src/pages/pricing.astro` (nuevo)
