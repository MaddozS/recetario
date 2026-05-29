# Data Model: Landing Page

**Phase**: 1 — Design & Contracts
**Date**: 2026-05-26

## Overview

La landing page no introduce nuevas entidades de datos. Los datos existentes relevantes son:

### PricingPlan (desde Stripe sync)

| Campo            | Tipo                   | Descripción                                            |
| ---------------- | ---------------------- | ------------------------------------------------------ |
| tier             | `free \| basic \| pro` | Identificador del plan                                 |
| name             | `string`               | Nombre mostrado (Free, Basic, Pro)                     |
| priceCents       | `number`               | Precio mensual en centavos (sincronizado desde Stripe) |
| yearlyPriceCents | `number`               | Precio anual en centavos                               |
| currency         | `string`               | Código ISO (default `mxn`)                             |
| features         | `FeatureFlag[]`        | Lista de funcionalidades con disponibilidad            |
| badge            | `string \| null`       | Texto promocional ("Más popular")                      |
| badgeClass       | `string`               | Clases CSS para el badge                               |

### FeatureFlag

| Campo     | Tipo                                        | Valores                          |
| --------- | ------------------------------------------- | -------------------------------- |
| key       | `string`                                    | Identificador único              |
| label     | `string`                                    | Texto mostrado al usuario        |
| status    | `"included" \| "excluded" \| "coming_soon"` | Disponibilidad en el plan        |
| iconClass | `string`                                    | Clase para icono (check/x/clock) |

## Notas

- No hay cambios en el schema de Prisma
- Los precios se obtienen via `getPricingPlans()` en `src/lib/db/billing.ts`
- La configuración local de planes está en `src/lib/plans-config.ts`
- Feature flags por plan definidos en `src/lib/db/billing.ts` (`BASIC_FEATURES`, `PRO_FEATURES`)
- El feature no requiere migraciones ni nuevas tablas
