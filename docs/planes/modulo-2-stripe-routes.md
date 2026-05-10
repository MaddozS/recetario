# Modulo 2: Stripe API Routes

## Objetivo

Crear los 3 endpoints de API para integracion con Stripe: checkout, webhook y portal de cliente.

## Archivos a Crear

### 1. `src/pages/api/stripe/checkout.ts`

**Metodo:** POST

**Proposito:** Crear una sesion de Stripe Checkout y redirigir al usuario.

**Request Body:**

```json
{
  "priceId": "price_xxx",
  "successUrl": "http://localhost:4321/settings/billing?success=1",
  "cancelUrl": "http://localhost:4321/pricing?canceled=1"
}
```

**Validaciones:**

1. Verificar que `priceId` existe en `subscription_plans` (proteccion contra price IDs invalidos)
2. Verificar que usuario esta autenticado (`Astro.locals.user`)
3. Si el usuario ya tiene `stripe_customer_id`, reusarlo. Si no, crear nuevo customer.

**Logica:**

```typescript
import Stripe from "stripe";

const stripe = new Stripe(
  import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "",
  {
    apiVersion: "2025-04-30.basil",
  },
);

// 1. Verificar auth
// 2. Buscar plan por priceId en DB
// 3. Buscar o crear Stripe Customer
//    - Si existe subscription con stripe_customer_id para este user, reusar
//    - Si no, crear: stripe.customers.create({ email: user.email, metadata: { userId: user.id } })
// 4. Crear Checkout Session
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  subscription_data: {
    trial_period_days: 14, // 14 dias de trial
  },
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: {
    userId: user.id,
    planId: plan.id,
  },
});

// 5. Retornar { url: session.url }
```

**Respuesta exitosa:**

```json
{ "url": "https://checkout.stripe.com/c/pay/cs_test_xxx" }
```

**Respuesta error:**

```json
{ "error": "Invalid price ID" } // 400
{ "error": "Authentication required" } // 401
```

### 2. `src/pages/api/stripe/webhook.ts`

**Metodo:** POST

**Proposito:** Recibir y procesar eventos de Stripe.

**Configuracion necesaria:**

- En Stripe Dashboard, configurar webhook endpoint: `https://tudominio.com/api/stripe/webhook`
- Eventos a escuchar:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

**Logica:**

```typescript
// 1. Verificar firma del webhook
const signature = request.headers.get("stripe-signature");
const payload = await request.text();

let event;
try {
  event = stripe.webhooks.constructEvent(
    payload,
    signature,
    import.meta.env.STRIPE_WEBHOOK_SECRET ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      "",
  );
} catch (err) {
  return new Response("Invalid signature", { status: 400 });
}

// 2. Procesar segun tipo de evento
switch (event.type) {
  case "checkout.session.completed": {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    // Obtener detalles de la subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Insertar/actualizar en DB
    await createOrUpdateSubscription({
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      userId,
      planId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    });
    break;
  }

  case "customer.subscription.updated": {
    const subscription = event.data.object;
    await createOrUpdateSubscription({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
      userId: null, // buscar por stripe_subscription_id
      planId: null, // buscar por stripe_price_id -> plan
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    });
    break;
  }

  case "customer.subscription.deleted": {
    const subscription = event.data.object;
    await cancelSubscription(subscription.id);
    break;
  }

  case "invoice.payment_failed": {
    const invoice = event.data.object;
    // Actualizar status a 'past_due'
    break;
  }
}

return new Response("OK", { status: 200 });
```

**IMPORTANTE - Raw Body:**
Astro consume el body como FormData por defecto. Para webhooks necesitamos el body raw como string.

```typescript
export const POST: APIRoute = async ({ request }) => {
  // No usar request.formData() ni request.json()
  const payload = await request.text();
  // ...
};
```

**IMPORTANTE - Configuracion en Vercel:**
En `astro.config.mjs`, asegurar que el body no se parsea:

```javascript
export default defineConfig({
  output: "server",
  adapter: vercel(),
});
```

### 3. `src/pages/api/stripe/portal.ts`

**Metodo:** POST

**Proposito:** Redirigir al usuario al Stripe Customer Portal para gestionar su suscripcion.

**Logica:**

```typescript
// 1. Verificar auth
// 2. Obtener subscription del usuario
const subscription = await getUserSubscription(user.id);
if (!subscription?.stripeCustomerId) {
  return new Response("No subscription found", { status: 404 });
}

// 3. Crear portal session
const portalSession = await stripe.billingPortal.sessions.create({
  customer: subscription.stripeCustomerId,
  return_url: `${Astro.url.origin}/settings/billing`,
});

// 4. Retornar URL
return new Response(JSON.stringify({ url: portalSession.url }), {
  headers: { "Content-Type": "application/json" },
});
```

**Respuesta exitosa:**

```json
{ "url": "https://billing.stripe.com/session/xxx" }
```

## Consideraciones de Seguridad

1. **Webhook Secret:** Nunca exponer `STRIPE_WEBHOOK_SECRET` en el frontend
2. **Price ID Validation:** Siempre verificar que el price ID existe en `subscription_plans` antes de crear checkout
3. **Auth:** Todos los endpoints excepto webhook requieren autenticacion
4. **Idempotencia:** Los webhooks pueden llegar duplicados. Usar `stripe_subscription_id` como unique key

## Variables de Entorno Requeridas

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**NOTA:** Para desarrollo local, necesitas:

1. `STRIPE_SECRET_KEY` (test key, empieza con `sk_test_`)
2. Para webhooks locales, usar Stripe CLI: `stripe listen --forward-to localhost:4321/api/stripe/webhook`
3. El webhook secret del CLI (empieza con `whsec_`) va en `STRIPE_WEBHOOK_SECRET`

## Testing

### Checkout

```bash
curl -X POST http://localhost:4321/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_xxx","successUrl":"http://localhost:4321/settings/billing?success=1","cancelUrl":"http://localhost:4321/pricing"}'
```

### Webhook (simulado)

Usar Stripe CLI:

```bash
stripe trigger checkout.session.completed
```

### Portal

```bash
curl -X POST http://localhost:4321/api/stripe/portal
```

## Archivos de Salida

- `src/pages/api/stripe/checkout.ts` (nuevo)
- `src/pages/api/stripe/webhook.ts` (nuevo)
- `src/pages/api/stripe/portal.ts` (nuevo)
