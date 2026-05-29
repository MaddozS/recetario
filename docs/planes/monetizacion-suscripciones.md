# Plan de Monetización: Modelo de Suscripciones

**Proyecto:** KitchCalc (recetario)  
**Fecha:** 2026-05-07  
**Versión:** 2.0  
**Status:** Implementado — En producción

---

## 1. Resumen Ejecutivo

Este documento define el modelo de negocio por suscripciones para KitchCalc, una aplicación de costeo de recetas dirigida a emprendedores de alimentos (home bakers, food trucks, cafeterías pequeñas).

**Modelo:** Freemium de 3 niveles (Free / Basic / Pro)  
**Rango de precios:** $5-10 USD/mes con descuento anual  
**Pasarela de pagos:** Stripe  
**Diferenciador clave:** Planificador de producción y exportación a PDF

---

## 2. Estructura de Planes

### Tabla Comparativa

| Feature                        | Free      | Basic ($5/mes)     | Pro ($10/mes)      |
| ------------------------------ | --------- | ------------------ | ------------------ |
| **Recetas**                    | 10        | 75                 | Ilimitadas         |
| **Ingredientes**               | 30        | Ilimitados         | Ilimitados         |
| **Costeo básico**              | Sí        | Sí                 | Sí                 |
| **Categorías**                 | Sí        | Sí                 | Sí                 |
| **Instrucciones (Markdown)**   | Sí        | Sí                 | Sí                 |
| **Duplicar receta**            | No        | Sí                 | Sí                 |
| **Fotos de recetas**           | No        | Sí (1 por receta)  | Sí + galería       |
| **Stock de ingredientes**      | No        | Sí                 | Sí                 |
| **Planificador de producción** | No        | Sí (máx 3 recetas) | **Sí (ilimitado)** |
| **Exportar PDF / Imprimir**    | No        | No                 | **Sí**             |
| **Costos fijos avanzados**     | No        | No                 | Sí                 |
| **Historial de cambios**       | No        | No                 | Sí                 |
| **Importar/Exportar datos**    | No        | No                 | Sí                 |
| **Información nutricional**    | No        | No                 | Sí                 |
| **Soporte**                    | Comunidad | Email prioritario  | Email prioritario  |

### Precios Sugeridos

| Plan  | Mensual     | Anual (ahorro)                    |
| ----- | ----------- | --------------------------------- |
| Basic | $5 USD/mes  | $48 USD/año (~$4/mes, 20% ahorro) |
| Pro   | $10 USD/mes | $84 USD/año (~$7/mes, 30% ahorro) |

**Trial:** 14 días de Pro gratis (requiere tarjeta de crédito, cancela antes de cobro)

### Justificación del Modelo de 3 Planes

Con solo Free/Pro saltamos de $0 a $10. Muchos usuarios caseros se sienten cómodos pagando $5 por "desbloquear más recetas", pero $10 les parece mucho si no usan el planificador. El Basic es un **escalón psicológico** que aumenta la conversión total.

---

## 3. Mapeo de Features vs Planes

| Feature                     | Estado Actual | Plan Mínimo                          |
| --------------------------- | ------------- | ------------------------------------ |
| CRUD Ingredientes + Recetas | ✅ Completo   | Free                                 |
| Cálculo de costos básico    | ✅ Completo   | Free                                 |
| Presentaciones + Escalado   | ✅ Completo   | Free                                 |
| Categorías                  | ✅ Completo   | Free                                 |
| Instrucciones               | ✅ Completo   | Free                                 |
| Duplicar receta             | ✅ Completo   | Basic                                |
| Costos fijos avanzados      | 🔜 Pendiente  | **Pro**                              |
| Planificador de producción  | 🚧 Fase 1 OK  | **Basic+** (3 rec) / Pro (ilimitado) |
| Fotos de recetas            | 🔜 Pendiente  | Basic                                |
| Stock de ingredientes       | 🔜 Pendiente  | Basic                                |
| Exportar PDF                | 🔜 Pendiente  | **Pro**                              |
| Historial de cambios        | 🔜 Pendiente  | **Pro**                              |
| Importar/Exportar datos     | 🔜 Pendiente  | **Pro**                              |
| Información nutricional     | 🔜 Pendiente  | **Pro**                              |
| Colaboración / Equipos      | 🔮 Futuro     | Futuro (Business)                    |
| API Pública                 | 🔮 Futuro     | Futuro (Business)                    |

> **Nota:** El Planificador de producción y Exportar PDF son los diferenciadores clave. Deben estar exclusivamente en Pro para justificar el precio.
> **Nota 2:** El `fixedCostsPercentage` (porcentaje de overhead por receta) actualmente es parte del costeo básico (Free). "Costos fijos avanzados" implica un sistema más completo (múltiples categorías, asignación entre recetas) que aún no está implementado.

---

## 4. Stack Técnico de Billing

### Componentes

| Componente            | Tecnología                        | Estado           |
| --------------------- | --------------------------------- | ---------------- |
| Pasarela de pagos     | Stripe Checkout + Customer Portal | ✅ En producción |
| SDK                   | `stripe` (Node.js) v22            | ✅ Instalado     |
| Checkout              | API route `/api/stripe/checkout`  | ✅ Implementado  |
| Webhooks              | API route `/api/stripe/webhook`   | ✅ Implementado  |
| Portal de cliente     | API route `/api/stripe/portal`    | ✅ Implementado  |
| Estado de suscripción | Tablas propias en Postgres/SQLite | ✅ Implementado  |

### Variables de Entorno

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC_MONTHLY=price_...
STRIPE_PRICE_ID_BASIC_YEARLY=price_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
```

### Esquema de Base de Datos

```sql
-- Planes disponibles
subscription_plans:
  id                    UUID PRIMARY KEY
  stripe_price_id       TEXT UNIQUE NOT NULL
  name                  TEXT NOT NULL
  tier                  TEXT CHECK (tier IN ('basic', 'pro'))
  billing_interval      TEXT CHECK (billing_interval IN ('monthly', 'yearly'))
  price_cents           INTEGER NOT NULL
  recipes_limit         INTEGER
  ingredients_limit     INTEGER
  features_json         JSONB -- { "production_planner": false, "pdf_export": true, ... }
  created_at            TIMESTAMP DEFAULT NOW()

-- Suscripciones por usuario
subscriptions:
  id                    UUID PRIMARY KEY
  user_id               TEXT NOT NULL
  stripe_customer_id    TEXT
  stripe_subscription_id TEXT
  plan_id               UUID REFERENCES subscription_plans(id)
  status                TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid', 'incomplete'))
  current_period_start  TIMESTAMP
  current_period_end    TIMESTAMP
  cancel_at_period_end  BOOLEAN DEFAULT false
  trial_end             TIMESTAMP
  created_at            TIMESTAMP DEFAULT NOW()
```

Esquema implementado en `src/lib/db/connection.ts` — soporta Postgres y SQLite con migraciones automáticas (`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE`).

### Arquitectura Implementada

1. **Middleware** (`src/middleware.ts`): Inyecta `Astro.locals.subscription` en cada request. Seeds planes al arranque.
2. **Feature gates** (`src/lib/subscription.ts`): `hasFeature(user, 'production_planner')`, `canCreateRecipe(user)`, `canCreateIngredient(user)` — consultan plan + conteos actuales.
3. **UI**: Componente `<UpgradePrompt tier="pro" />` (`src/components/UpgradePrompt.astro`) que aparece cuando un usuario Free/Basic toca una feature bloqueada.
4. **Webhook handler** (`src/pages/api/stripe/webhook.ts`): Actualiza `subscriptions.status` en tiempo real ante `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

---

## 5. Flujo de Usuario

```
1. Usuario se registra (Google OAuth)
   └── Cuenta Free automática (0 recetas, 0 ingredientes)

2. Usa la app con límite de 10 recetas / 30 ingredientes

3. Al intentar crear la 11ª receta o 31º ingrediente
   └── Validación server-side + modal "Límite alcanzado" con CTA a /pricing

4. En /pricing elige Basic o Pro
   └── Redirección a Stripe Checkout (con trial de 14 días)

5. Pago exitoso (o inicio de trial)
   └── Webhook actualiza plan a "active" / "trialing"
   └── Redirección a /settings/billing

6. Desde /settings/billing puede:
   ├── Ver estado actual de suscripción
   ├── Ver barras de uso (recetas/ingredientes)
   ├── Ver funciones incluidas según el plan
   ├── Abrir Stripe Customer Portal (cambiar plan, método de pago, cancelar)
   └── Descargar facturas

7. Downgrade / Upgrade:
   ├── Basic → Pro: Prorrateo inmediato
   └── Pro → Basic: Al final del periodo actual
```

---

## 6. Roadmap de Implementación

### Fase 1: Fundamentos de Billing ✅ (Completada)

- [x] Crear tablas `subscription_plans` y `subscriptions` en schema
- [x] Crear productos/prices en Stripe Dashboard
- [x] Implementar `/api/stripe/checkout` (crear sesión de pago)
- [x] Implementar `/api/stripe/webhook` (manejar eventos de Stripe)
- [x] Implementar `/api/stripe/portal` (redirigir a Customer Portal)
- [x] Crear página `/pricing` con comparativa de planes
- [x] Actualizar middleware para inyectar plan en `Astro.locals`

### Fase 2: Feature Gates y Límites ✅ (Completada)

- [x] Implementar `hasFeature(user, featureName)`
- [x] Implementar `canCreateRecipe(user)` y `canCreateIngredient(user)`
- [x] Agregar validaciones de límite en create de recetas/ingredientes
- [x] Crear componente `<UpgradePrompt />` para features bloqueadas
- [x] Crear página `/settings/billing` con estado de suscripción
- [x] Agregar link a Customer Portal en settings

### Fase 3: Trial y Optimización ✅ (Completada)

- [x] Configurar trial de 14 días en Stripe Checkout
- [x] Implementar banner "Estás en trial: X días restantes"
- [ ] Agregar logs de uso para entender conversión
- [ ] Configurar emails automáticos de Stripe (comprobante de pago, renovación, cancelación)

### Fase 4: Power Features (Progresivo, post-lanzamiento)

- [ ] **Planificador de producción** → restringir a Pro (`docs/planes/planificador-produccion.md`)
- [ ] **Exportar PDF** → restringir a Pro
- [ ] **Stock de ingredientes** → restringir a Basic/Pro
- [ ] **Fotos de recetas** → restringir a Basic/Pro

---

## 7. Métricas de Éxito (KPIs)

| Métrica                 | Definición                                          | Objetivo a 6 meses |
| ----------------------- | --------------------------------------------------- | ------------------ |
| Free-to-Paid Conversion | % de usuarios Free que pagan                        | > 4%               |
| Trial-to-Paid           | % de trials que convierten a pago                   | > 30%              |
| Churn mensual           | % de usuarios que cancelan por mes                  | < 5%               |
| MRR                     | Monthly Recurring Revenue                           | $500+ USD          |
| ARPU                    | Average Revenue Per User                            | ~$7 USD            |
| Engagement Free         | Recetas creadas por usuario Free (antes de upgrade) | > 5                |
| Tasa de upgrade         | % de Basic que pasan a Pro                          | > 15%              |
| Time to First Payment   | Días desde registro hasta primer pago               | < 14 días          |

---

## 8. Riesgos y Mitigaciones

| Riesgo                                   | Probabilidad | Impacto | Mitigación                                                                                                 |
| ---------------------------------------- | ------------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| Stripe no disponible en país del usuario | Media        | Alto    | Evaluar LemonSqueezy o Paddle para LATAM. Stripe ya funciona en la mayoría de países hispanohablantes.     |
| Usuarios no ven valor en Pro             | Media        | Alto    | Enfocar marketing en "ahorro de tiempo": una corrida de producción mal calculada cuesta más que $10/mes.   |
| Competidores gratuitos (Excel, Notion)   | Alta         | Medio   | Diferenciación en cálculo automático y planificador. Excel no descuenta stock ni genera listas de compras. |
| Churn por falta de uso                   | Media        | Medio   | Recordatorios por email y onboarding de primera receta. Stripe envía emails automáticos de renovación.     |
| Pricing en USD para LATAM                | Media        | Medio   | Stripe permite cobrar en moneda local (MXN, ARS, COP, CLP). Mostrar precios en moneda local en UI.         |
| Usuarios comparten una cuenta Pro        | Baja         | Medio   | No es prioritario ahora. En futuro, limitar sesiones simultáneas o agregar plan Business con equipos.      |
| Dependencia total de Stripe              | Baja         | Alto    | Stripe es estándar de la industria. Si cambia, la migración de `stripe_subscription_id` es factible.       |

---

## 9. Decisiones Tomadas

- [x] **Modelo:** Free / Basic / Pro con 3 niveles — implementado
- [x] **Stripe:** Cuenta configurada con products/prices creados — implementado
- [x] **Trial:** 14 días con tarjeta de crédito requerida — implementado
- [x] **Moneda:** USD (facturación y UI)
- [x] **Features del Free:** 10 recetas / 30 ingredientes — implementado

### Decisiones Pendientes

- [ ] **¿Plan Business futuro?** ¿Queremos reservar un plan de equipos para más adelante?
- [ ] **¿Moneda local en UI?** ¿Mostrar precios en moneda local detectada geográficamente?
- [ ] **¿Logs de uso y analytics?** Para tracking de conversión y engagement.

---

## 10. Referencias y Recursos

- [Stripe Checkout Docs](https://stripe.com/docs/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/customer-management)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks)
- [Roadmap actual del proyecto](/docs/planes/roadmap.md)
- [AGENTS.md - Convenciones del proyecto](/AGENTS.md)

---

**Document Status:** Implementado  
**Last Updated:** 2026-05-09  
**Next Review:** Al completar Fase 4
