# Review — KitchCalc (apps/web)

**Modo:** `/design review` · **Fecha:** 2026-09-18 · **Alcance:** el pase de recolor del acento (familia coral + rol de relleno de acción) y las superficies que toca: sección CTA del landing, shell privado, toolbar de recetas, settings y pricing.

**Veredicto: Block** — 35/50. Una violación de contraste `HIGH` sigue en pie en oscuro + coral (1.95:1 y 3.95:1 medidas con axe sobre superficies reales).

---

## TL;DR

El pase de color arregló lo que el usuario señaló: el coral ya no cambia de identidad entre temas (la banda del CTA y los rellenos de acción renderizan el mismo coral en claro y oscuro, medido en el DOM), la rampa dejó de derivar de tono, y la sección CTA pasó de rosa neón con texto casi negro y botón salmón a banda coral profunda con texto blanco y CTA blanco con anillo de foco verificado.

Pero el mecanismo de paridad se aplicó al canal equivocado: el override del tema oscuro vive dentro de `resolveShade()`, que alimenta **toda** la rampa `--color-accent-*`, no solo el rol de relleno. En oscuro + coral, `text-accent-800` (#b33b3c) sobre los tintes `bg-accent-50` (#6b1f20) quedó en **1.95:1** (antes 6.01:1) y `text-accent-700` (#c94445) sobre el fondo quedó en **3.95:1**. Es una regresión introducida por este pase, con 7 nodos en 5 superficies y una única causa raíz.

**Siguiente acción:** un `/design recolor` acotado a `apps/web/app/utils/accent-colors.ts` (aplicar el override solo a `--color-accent-solid` / `-hover`, dejando `darkShadeMap` para los shades de texto y tinte) y volver a correr el barrido `acentos` del spec de a11y como criterio de aceptación.

---

## Scores por lente (/50)

| # | Lente            | Score | Hallazgo clave                                                                                   |
| - | ---------------- | ----- | ------------------------------------------------------------------------------------------------ |
| 1 | First impression | 7/10  | El CTA dejó el rosa neón con texto negro; ahora es una banda coral profunda con CTA blanco.        |
| 2 | Hierarchy        | 8/10  | Titular negro pesado + primario blanco + fantasma translúcido: el ojo sabe dónde actuar primero.  |
| 3 | Color voice      | 5/10  | La identidad del coral ya es una sola, pero el rol de relleno se filtró al rol de texto (1.95:1). |
| 4 | Type voice       | 7/10  | Sin cambios en esta pasada; jerarquía por tamaño y peso, sin regresiones observadas.              |
| 5 | Interaction feel | 8/10  | Anillos de foco verificados en ambos CTA (blanco 2px + offset coral); target mínimo 44px.          |

---

## Hallazgos

| # | Severidad | Disciplina | Ubicación                                                                                              | Antes                                                                                                                                                                 | Después                                                                                                            | Por qué |
| - | --------- | ---------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------- |
| 1 | HIGH      | Color      | `apps/web/app/utils/accent-colors.ts:186` (`solidShadeOverrides`), `:211` (`resolveShade`), `:215` (loop de shades) | `resolveShade()` aplica el override de paridad a los 9 shades, así que en oscuro `--color-accent-700/800` de coral pasan a `#c94445` / `#b33b3c` (valores del tema claro) | Aplicar el override **solo** al emitir `--color-accent-solid` y `--color-accent-solid-hover`; los shades `50…800` siguen saliendo de `darkShadeMap` | El 700/800 también es rol de texto y de tinte: en oscuro + coral `text-accent-800` sobre `bg-accent-50` mide 1.95:1 (antes 6.01:1) y `text-accent-700` sobre el fondo 3.95:1. 7 nodos en 5 superficies (_/recipes_, _/settings?tab=preferences_, _/produccion_, _/pricing_, más el landing) |
| 2 | LOW       | Color      | `apps/web/app/components/landing/PricingSection.vue:91`                                                | `dark:bg-accent-950/10` en la card Pro                                                                                                                                   | Emitir los shades `900`/`950` (con su mapeo oscuro) o usar un token existente                                        | `--color-accent-950` no existe en `@theme` ni en la emisión (`ACCENT_SHADES` llega a 800), así que la utilidad no pinta nada: el tinte previsto de la card Pro nunca se aplica |

### Evidencia del hallazgo 1 (medida, no apariencia)

| Superficie                     | Nodo                                                                        | Par medido                              | Ratio   | Antes del pase |
| ------------------------------ | --------------------------------------------------------------------------- | --------------------------------------- | ------- | -------------- |
| `/recipes`                     | `.whitespace-nowrap.text-[10px].px-2` (Badge de categoría)                   | `#b33b3c` sobre `#6b1f20`               | 1.95:1  | 6.01:1         |
| `/settings?tab=preferences`    | `.bg-accent-100.dark:bg-accent-50.border-accent-200` (Badge)                 | `#b33b3c` sobre `#6b1f20`               | 1.95:1  | 6.01:1         |
| `/settings?tab=preferences`    | `.ring-accent-500 > .text-accent-800` (tarjeta de acento)                     | `#b33b3c` sobre `#6b1f20`               | 1.95:1  | 6.01:1         |
| `/settings?tab=preferences`    | `.border-accent-600` (tab activa)                                             | `#c94445` sobre `#0f1114`               | 3.95:1  | 7.48:1         |
| `/produccion`, `/pricing`      | Badges equivalentes                                                          | `#b33b3c` sobre `#6b1f20`               | 1.95:1  | 6.01:1         |

Nodos sintomáticos en código (mismo par, un solo arreglo): `components/ui/atoms/Badge.vue:31`, `features/recipes/RecipesStats.vue:14`, `features/recipes/RecentRecipes.vue:36`, `features/recipes/RecipesToolbar.vue:41`, `features/recipes/PresentationCard.vue:262`, `features/recipes/RecipeIngredientView.vue:109`, `features/ingredients/IngredientsListCard.vue:145`, `features/billing/BillingSection.vue:206`, `features/settings/PreferencesSection.vue:126`, `components/landing/HeroSection.vue:94`, `components/landing/HowItWorksSection.vue:93`.

---

## Qué funciona

- **Paridad real de tema.** La banda del CTA y el relleno de acción renderizan el mismo coral en claro y oscuro: `#c94445` con degradado a `#b33b3c` y texto `#ffffff`, verificado por estilos computados en ambos temas. Antes: `#e84d5a → #ff5f6d → #ff7b6e` en oscuro con etiqueta `#171717`.
- **Rampa coral coherente.** Un solo tono (H≈24) en los 11 pasos, chroma recortado al 92% del máximo del gamut. Antes los tints iban a H≈34 y los vívidos a H≈19 (16° de deriva) y el 500 tocaba el borde del gamut.
- **CTA reconstruido.** Titular y subtítulo en blanco (4.78–5.82:1 sobre la banda), primario blanco con etiqueta coral (`#c94445` sobre `#ffffff` = 4.78:1) y fantasma translúcido con borde `white/40`.
- **Foco verificado.** Ambos botones del CTA muestran anillo visible con `:focus-visible`: blanco 2px, con offset coral en el primario para no perderse sobre la banda.
- **Estados de selección.** Sidebar activa, bottom nav, pill de categoría y contador interno (`bg-current/20` sobre el relleno) medidos en oscuro + coral: coral `#c94445` con texto blanco.

---

## Considerado y descartado

| Ubicación                                                       | Candidato                                                                                                                     | Por qué se descarta                                                                                                                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/landing/CTASection.vue:11`                          | La banda ahora es más profunda en claro que el resto de planos coral del landing (navbar/hero usan los tonos vívidos)          | Deliberado: la banda debe sostener texto blanco AA y ser idéntica entre temas; la profundidad funciona como cierre de la página, no como inconsistencia                    |
| `apps/web/app/utils/accent-colors.ts:186` (familias no-coral)   | Extender la paridad estricta a indigo/violet/blue/emerald/rose/amber                                                           | Solo se pidió coral; el resto del sistema fue validado en el barrido 13a y su relleno claro en oscuro es el comportamiento sobre el que se apoyan los contrastes actuales |
| `apps/web/app/utils/accent-colors.ts:228`                       | No emitir `--tw-text-on-accent` para las familias no-coral (dejar el valor de `tokens.css`)                                     | Duplicaría la fuente de verdad: hoy la familia es el único origen del color sobre el relleno; para no-coral el valor emitido es idéntico al de `tokens.css`                 |
| `apps/web/app/components/ui/atoms/Button.vue:47`                | Reutilizar `bg-accent-700` con un modificador de tema en lugar de un token de rol                                               | Un token de rol es lo que permite que coral conserve su tono mientras el resto de familias sigue aclarando el relleno en oscuro                                             |

---

## Verificación

**Pasada**

- `pnpm --filter @recetario/web test` → 49 archivos, 659 tests en verde (incluye el contrato nuevo de `accent-colors`: paridad del relleno y texto por familia).
- `pnpm --filter @recetario/web type-check` → limpio. `eslint` y `prettier --check` limpios en los archivos tocados.
- Sonda de estilos computados sobre el dev server (Playwright) en claro y oscuro: banda del CTA idéntica, primario `#ffffff`/`#c94445`, anillos de foco presentes, pill y contador del toolbar correctos.
- Barrido axe 7 familias × claro/oscuro sobre `/recipes` (sonda dedicada): 1 violación, la del hallazgo 1.

**Fallada**

- `pnpm --filter @recetario/web test:e2e` (barrido `acentos`, 6 superficies): fallan por el hallazgo 1.
- `firefox-smoke` (2 journeys): fallo de lanzamiento del navegador en este entorno (`sandbox_extension_issue_file_to_process failed`), no relacionado con el diseño.

**No verificado**

- Inspección visual por ojo del resultado renderizado: el entorno no muestra las capturas y el run de Playwright borró `test-results/`. La evidencia es de estilos computados y axe, no de pixeles.
- Contraste de las páginas públicas en oscuro dentro del gate del repo: el barrido base solo escanea público/auth en claro; el CTA en oscuro se verificó por medición (4.78:1), no por axe.
- Hover del botón fantasma (`hover:bg-white/10`) y estados `:active`: definidos y razonados, sin medición automática.
- Firefox/WebKit fuera de los smokes de jornada.

---

## Siguientes modos

- `/design recolor` — acotado a `accent-colors.ts`: separar el override de paridad del rol de relleno y dejar la rampa de texto/tinte en `darkShadeMap`. Criterio de aceptación: el barrido `acentos` del spec de a11y en verde.
- `/design a11y` — no hace falta por foco ni teclado (verificado); solo si se quiere ampliar el gate a las superficies públicas en oscuro.
