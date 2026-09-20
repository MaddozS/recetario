# Task — T6: copy del embudo (hero, cierre y catálogo de planes)

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Predecesoras: `.commandcode/design/review-report.md` (review de las superficies públicas, veredicto **Block** 33/50), el plan `~/.commandcode/plans/landing-review-fixes.md` —que asigna a esta sesión los hallazgos **8** (el cierre repite el hero y "Prueba gratis" miente) y **9** (tildes del catálogo)— y las tareas ya cerradas `docs/tasks/task-20260920-2044-accent-text-role.md` (T1), `task-20260920-0907-landing-a11y-semantics.md` (T2), `task-20260920-1017-plan-card-shell.md` (T3), `task-20260920-1046-lightbox-zoom.md` (T4) y `task-20260920-1132-hero-proof-and-type.md` (T5).

- **Scope:** `fix` de copy. Ninguna decisión de composición, color o interacción.
- **Pre-existing:** `landing/HeroSection.vue` (nota al pie de la tarjeta de costo), `landing/CTASection.vue` (titular y remate de la banda coral), `packages/stripe/src/plans-config.ts` (`TIER_CONFIG`: `features[].text`, `badge.text` son la **fuente única** de las dos superficies de planes).
- **Dependencies:** T5 (cerrada; misma superficie).
- **No hizo:** el relayout de la comparación de planes (T7) ni la meta descripción por defecto de `nuxt.config.ts` (fuera del alcance del hallazgo 9: las públicas la sobrescriben con `usePageSeo`).
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, worktree `worktree-nuxt-rework`, `pnpm dev` con datos reales de planes (MXN $0 / $79 / $249 desde el catálogo). Gates en chromium (`firefox-smoke` sigue sin arrancar en esta máquina).

## Resultado

- **El catálogo de planes está en español correcto en las dos superficies a la vez** (una sola fuente: `TIER_CONFIG`): `Costeo básico con márgenes`, `Categorías`, `Instrucciones de preparación`, `Información nutricional`, `Fotos de recetas + galería`, `Planificador de producción (…)` y el badge `Más popular`. Sin migración ni reseed: la BD sólo guarda `featuresJson` con los flags booleanos de `FEATURE_FLAGS` (`stripe-api.ts:28`) y los precios de Stripe; el texto visible sale de la config.
- **El hero deja de prometer una prueba que no existe.** "Prueba gratis" pasa a "Plan gratis para siempre", que es lo que el producto hace: el plan Free no tiene precio ni caducidad (`PlanPrice.vue` lo renderiza como "Gratis" y `TIER_CONFIG.free` no tiene price IDs).
- **El cierre avanza en vez de repetir.** El h1 del hero dice "Calcula el costo real de tus recetas"; la banda final decía "Empieza a calcular el costo real de tus recetas hoy". Ahora dice qué pasa en los primeros minutos y desaparece el segundo "Sin tarjeta de crédito" con otro remate.
- **La banda de cierre ocupa menos alto que antes en móvil**, no más: el titular baja de 4 a 2 líneas a 320 y de 3 a 2 a 375 (medido con la copia vieja inyectada en el mismo nodo).

## Copy final

| Superficie                             | Antes                                                          | Ahora                                                              |
| -------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Nota del hero (`HeroSection.vue:160`)  | "Sin tarjeta de crédito. Prueba gratis."                        | "Sin tarjeta de crédito. Plan gratis para siempre."                 |
| Titular del cierre (`CTASection.vue:36`) | "Empieza a calcular el costo real de tus recetas hoy"           | "Ponle precio a tu próxima receta"                                  |
| Remate del cierre (`CTASection.vue:39`) | "Sin tarjeta de crédito. Configuración en segundos."            | "En tu primera receta ves el costo, el margen y cuánto cobrar."     |
| Catálogo (7 cadenas × 3 planes)         | `Costeo basico con margenes`, `Categorias`, `Instrucciones de preparacion`, `Informacion nutricional`, `galeria`, `produccion`, badge `Mas popular` | Las mismas con tilde y el badge `Más popular`                       |

## Diagnóstico

### Hallazgo 8 — el cierre era un segundo hero y "Prueba gratis" contradecía al plan Free

Dos defectos distintos en la misma banda:

1. **Repetición.** El titular de cierre reusaba el del hero palabra por palabra ("Calcula el costo real de tus recetas" → "Empieza a calcular … hoy"). Una sección de cierre que dice lo mismo que la primera pantalla gasta el último scroll sin añadir información.
2. **Promesa falsa.** "Prueba gratis" implica un trial con vencimiento; el plan Free es permanente y no pide tarjeta (`/pricing` lo llama "Free · Gratis"). Además "Sin tarjeta de crédito" aparecía dos veces con distinto remate, lo que convierte una condición real en relleno.

Lo que se hizo: la banda pasa a hablar del **resultado de los primeros minutos** ("En tu primera receta ves el costo, el margen y cuánto cobrar"), que es lo que el usuario verifica en su primera sesión —el mismo artefacto que el hero ilustra con la tarjeta de costo—, y el titular pasa a ser una acción concreta sobre la decisión de compra del negocio ("Ponle precio a tu próxima receta"). El remate duplicado desaparece: la condición de "sin tarjeta" queda donde se decide la cuenta (hero) y el plan gratis se nombra una sola vez.

### Hallazgo 9 — el texto de mayor confianza del embudo estaba sin tildes

Las 14 filas de cada plan se renderizan en `/` y en `/pricing` desde el mismo `TIER_CONFIG`, y siete de ellas (más el badge de Pro) venían sin acentuar: `basico`, `margenes`, `Categorias`, `preparacion`, `Informacion`, `galeria`, `produccion`. Es el copy que se compra por MXN $249 y el único que un cliente potencial lee antes de decidir. Se corrigió en el origen, así que las dos superficies quedan iguales por construcción, no por edición paralela.

## Enumeración de estados responsive (obligatoria)

El cambio es de texto, no de composición: lo que varía por estado es el **alto del bloque**, que es la causa real de una rotura de layout. Medido con la copia vieja inyectada en el mismo nodo (mismo CSS, misma fuente, mismo ancho):

| Estado (banda de cierre) | Mobile (320)      | Mobile (375)      | Desktop (1280)   |
| ------------------------ | ----------------- | ----------------- | ---------------- |
| Titular, antes           | 4 líneas          | 3 líneas          | 2 líneas         |
| Titular, ahora           | **2 líneas**      | **2 líneas**      | 2 líneas         |
| Remate, antes            | 2 líneas          | 2 líneas          | 1 línea          |
| Remate, ahora            | 3 líneas          | 2 líneas          | 1 línea          |
| `text-wrap: balance`     | aplicado (`balance`) | aplicado (`balance`) | aplicado (`balance`) |
| Overflow horizontal      | 0                 | 0                 | 0                |

| Estado (nota del hero)   | Mobile (320)      | Mobile (375)      | Desktop (1280)   |
| ------------------------ | ----------------- | ----------------- | ---------------- |
| Nota del plan gratis     | 2 líneas          | 1 línea           | 1 línea          |

Paridad móvil/escritorio: la misma copia en los tres anchos y en los dos temas; lo único que cambia es el número de líneas. Ninguna cadena se recorta ni se abrevia por breakpoint.

## Decisiones

| # | Decisión | Motivo |
| - | -------- | ------ |
| 1 | El titular del cierre es una **acción sobre el precio** ("Ponle precio a tu próxima receta"), no una promesa del producto. | El h1 ya promete "calcular el costo real": lo que falta al final del embudo es la decisión de negocio (PRODUCT.md: "el output son decisiones de precio confiadas"). Evita la repetición del h1 por construcción, no por sinonimia. |
| 2 | El remate dice qué **ve** el usuario, no lo que la app hace: "el costo, el margen y cuánto cobrar". | Es la propuesta del plan ("qué se ve en los primeros minutos") y el mismo artefacto que el hero ya prueba con la tarjeta de costo. |
| 3 | El remate se acortó de 81 a 65 caracteres tras medirlo. | Con 81 caracteres daba 3 líneas a 320 y 375 (el remate nunca tuvo más de 2): el bloque crecía donde el ancho escasea. Con 65, 2 líneas a 375 y 1 en escritorio. |
| 4 | "Plan gratis para siempre" en vez de "prueba": la afirmación se sostiene en el código. | `TIER_CONFIG.free` no tiene price IDs, `PlanPrice.vue` renderiza "Gratis" y el plan no caduca en ningún contrato del repo. |
| 5 | Se corrigen las tildes de las 3 apariciones de cada cadena (Free/Basic/Pro), no sólo las visibles hoy. | Son la misma fuente para `/` y `/pricing`; dejar una sin corregir habría reintroducido el defecto en la próxima superficie que monte el catálogo. |
| 6 | Nada de tests nuevos para el copy. | El plan no los pide y un assert de cadenas literales se rompe con cada edición de copy legítima. La verificación es sobre el render (grep del SSR de las dos superficies + las suites completas), no sobre una constante duplicada. |

## Verificación

| # | Comando | Esperado | Resultado |
| - | ------- | -------- | --------- |
| 1 | `pnpm --filter @recetario/web test` (base, antes de tocar) | `unit` + `nuxt` verdes | ✅ 677 tests / 50 ficheros |
| 2 | `pnpm --filter @recetario/web test` (después) | Sin regresión | ✅ 677 tests (sin tests nuevos, según la decisión 6) |
| 3 | `pnpm --filter @recetario/stripe test` | La fuente del catálogo compila y sus 66 tests siguen | ✅ 66 tests |
| 4 | `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL pnpm --filter @recetario/api test` · `… @recetario/db test` | El catálogo viaja por el API y la BD sin textos persistidos | ✅ 220 y 39 tests |
| 5 | `pnpm --filter @recetario/web type-check` · `pnpm --filter @recetario/web lint` | Limpios | ✅ |
| 6 | `env -u WEB_ORIGIN … playwright test test/e2e/public.spec.ts test/e2e/a11y.spec.ts test/e2e/contrast.spec.ts --project=chromium` | Landings + gates de a11y/contraste | ✅ 40/40 en 1.4 min |
| 7 | `curl` del SSR de `/` y `/pricing` | Las 7 cadenas con tilde en **ambas**, "prueba" ausente en `/`, h1 ≠ titular del cierre | ✅ 7/7 en las dos superficies; `grep -i prueba` en `/` → sin coincidencias |
| 8 | `agent-browser eval` (líneas y overflow, 320/375/768/1280 × claro/oscuro) | Sin rotura, `text-wrap: balance` vivo | ✅ tabla de arriba; `scrollWidth - clientWidth === 0` en los 8 barridos |
| 9 | QA visual `agent-browser` (1280 y 375 × claro/oscuro) | La copia se lee y no rompe la banda | ✅ capturas abajo |

### Visual QA

Evidencia en `apps/web/test-results/qa-t6/` (gitignored; **Playwright borra `test-results/` al arrancar**, así que las capturas se tomaron después del último run, con el CSS de asentado de `test/e2e/support/page-sweep.ts` y scroll `instant` —el landing usa `scroll-behavior: smooth` y sin eso la captura sale a mitad de camino).

- `01-cierre-1280-light` / `-dark`: la banda coral con el titular nuevo en 2 líneas y el remate en 1; los dos CTA (blanco y borde) intactos y el anillo de foco del botón blanco sin tocar.
- `04-cierre-375-light` / `-dark`: titular en 2 líneas y remate en 2; los CTA apilados; el pie asoma bajo la banda (cliffhanger conservado).
- `02-heroe-1280-light` / `-dark` y `05-heroe-375-*`: la nota "Sin tarjeta de crédito. Plan gratis para siempre." bajo la tarjeta de costo, en el mismo tamaño y color que antes.
- **Escritorio vs móvil (paridad):** misma copia, mismos elementos; móvil sólo reordena y reduce el titular. Nada de la banda se oculta en ningún ancho.
- **Catálogo:** captura de `/pricing` en oscuro con las tres cards y las 14 filas por plan ya acentuadas, incluida la fila de estado `Próximamente:` que T2 añadió para lectores de pantalla (`Incluido:` visible en el DOM al leer el card).

## Desviaciones respecto del plan

| # | Desviación | Motivo |
| - | ---------- | ------ |
| 1 | El titular del cierre no es la propuesta base del plan ("Tu primera receta con precio en menos de un café"). | El plan admitía cualquiera de las dos líneas ("resultado del negocio" o "primeros minutos") siempre que no repitiera el h1. Se eligió la acción sobre el precio y el remate se quedó con los primeros minutos, así la banda cubre las dos ideas en vez de una frase con metáfora de tiempo. |
| 2 | El remate no conserva "Sin tarjeta de crédito" (el plan sólo pedía cambiar el titular). | El hallazgo 8 lo señalaba explícitamente como defecto ("aparece dos veces con distinto remate"): mantenerlo habría dejado la mitad del hallazgo abierta. La condición sigue en el hero, que es donde se decide crear la cuenta. |
| 3 | No se tocó `nuxt.config.ts` (meta descripción por defecto con "produccion"). | Esa cadena no llega a las públicas: `usePageSeo` publica la suya en `/`, `/pricing`, `/privacy` y `/terms` (y el e2e la asertan). Queda anotada como hallazgo abierto. |

## Riesgos y rollback

| Riesgo | Mitigación |
| ------ | ---------- |
| El catálogo es la fuente compartida de `/` y `/pricing`; una errata toca las dos superficies. | Los fixtures de los specs (`public-ui.spec.ts`, `billing-ui.spec.ts`, `plans.test.ts`, `stub-api.mjs`) usan su propio plan de prueba y **no** leen `TIER_CONFIG`: no se rompen por copy, pero tampoco avisan de una errata. La verificación de esta tarea es el grep del SSR de las dos superficies (fila 7). |
| El stub e2e mantiene "Mas popular" en su fixture, así que el entorno de pruebas no refleja esa cadena. | Anotado como hallazgo abierto; el stub es del pase de CSRF en curso, no de esta tarea. |
| Rollback | Revertir los dos commits devuelve las cuatro cadenas al texto anterior; no hay datos persistidos que limpiar (la BD nunca guardó este copy). |

## Commits

| Commit | Contenido |
| ------ | --------- |
| `fix(stripe): copy del catálogo de planes con tildes correctas` | `packages/stripe/src/plans-config.ts` |
| `fix(web): copy del hero y del cierre sin promesas de prueba` | `landing/HeroSection.vue`, `landing/CTASection.vue`, este task file |

## Hallazgos abiertos y quién los atiende

| # | Hallazgo | Dónde se manifiesta | Dueño | Cómo se cierra |
| - | -------- | ------------------- | ----- | -------------- |
| 1 | La meta descripción por defecto del sitio dice "planificador de produccion" (sin tilde). | `apps/web/nuxt.config.ts:93,99` | Pase de copy del sitio (no hay tarea asignada) | Las públicas ya publican la suya; el arreglo es de una línea y sólo alcanza a rutas `noindex`. |
| 2 | Los fixtures de prueba llevan el badge "Mas popular" y sus propias features (`Hasta 10 recetas`, …) en vez de importar el catálogo real. | `test/e2e/support/stub-api.mjs:114`, `test/nuxt/public-ui.spec.ts:77`, `apps/api/src/billing/plans.test.ts:50` | T7 (toca el stub si necesita features diferenciadas) | Importar el catálogo real en el stub o acentuar el fixture; ninguno de los specs aserta esas cadenas hoy. |
| 3 | El cierre no menciona el plan gratis ni "sin tarjeta": se apoya en el hero y en el botón "Comenzar gratis". | `landing/CTASection.vue` | Review final (T7) | Si el review pide la condición otra vez al final, el sitio es el remate (que hoy habla de los primeros minutos), no volver a repetir el hero. |
