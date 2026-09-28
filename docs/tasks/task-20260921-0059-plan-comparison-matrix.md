# Task — Matriz única de comparación de planes (issue #186)

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

- **Spec:** issue [#186](https://github.com/MaddozS/recetario/issues/186) — «Spec: matriz única de comparación de planes en /pricing» (etiqueta `ready-for-agent`).
- **Scope:** `extends-existing` sobre la comparación de `/pricing` de T7 (`docs/tasks/task-20260920-1205-plan-comparison.md`) y sobre el catálogo de `packages/stripe`.
- **Pre-existing:** `PlanComparison.vue` (tabla de las 5 filas que cambian + lista de las 9 comunes), `plan-comparison.ts` (`changing`/`shared`), `plan-feature-state.ts` (estado que colapsaba `included` bajo `coming_soon`), `PlanFeatureList.vue` (contrato accesible de T2), `TIER_CONFIG` + `planFeatureSchema` (sin etiqueta de fila) y el espejo del catálogo en el stub e2e.
- **Dependencias:** ninguna abierta. Sustituye la decisión 4 de T7 («la matriz lleva sólo las filas que cambian») y cierra el hallazgo 3 del review de landings (la promesa de «Próximamente»).

## Análisis: qué cambia y por qué

La comparación partía en dos artefactos (tabla de diferencias + lista de lo común) y el catálogo no tenía etiqueta de fila: la matriz no podía listar una función común sin repetir su frase en las tres columnas. La etiqueta es el dato que faltaba, y vive donde vive el catálogo.

| Pieza | Antes | Después |
| ----- | ----- | ------- |
| Filas de la tabla | 5 (sólo lo que cambia) | **14** (todas, en orden del catálogo) |
| Bloque «Igual en todos los planes» | lista aparte de 9 filas | desaparece: son filas de la matriz con sus tres marcas |
| Etiqueta de fila | no existía | `label` en `PlanFeature`, declarada sólo donde la frase cambia entre planes (`Recetas`, `Ingredientes`, `Fotos de recetas`, `Planificador de producción`) |
| Celda | estado + frase del plan | estado + frase del plan **sólo si dice más que la etiqueta** (una fila compartida no repite nada) |
| «Próximamente» | colapsaba `included` (mentía por omisión) | dos estados: `coming_soon` (será tuya) y `coming_soon_excluded` (no lo será); la marca dice la inclusión y «Próximamente» es texto visible |

## Contratos nuevos

| Contrato | Definición |
| -------- | ---------- |
| `label` del catálogo | `planFeatureSchema` gana `label` **opcional** (`z.string().min(1)`); `TIER_CONFIG` la declara en los 4 slots con frase propia por plan, idéntica en los tres tiers. `buildPricingPlans` la pasa tal cual y viaja en `GET /api/billing/plans`. |
| Contrato de etiquetas | Test de datos en `packages/stripe`: por cada slot, si los tres tiers no comparten el texto, cada uno declara la misma `label` no vacía. Evita que una edición futura degrade la matriz en silencio. |
| Matriz (`comparePlans`) | Devuelve `PlanComparisonRow[]` (`{ label, cells }`), todas las filas en orden del catálogo; `label = feature.label ?? feature.text`; celda `{ text, state }` con `text: null` cuando la frase no aporta sobre la etiqueta y `state: null` cuando el plan no trae la fila. |
| Estado de fila | Cuatro valores sin colapso: `included`, `excluded`, `coming_soon`, `coming_soon_excluded`; la marca dice la inclusión (check/x), `planFeatureMarker(state, text)` da el texto visible («Próximamente», con separador « · » cuando sigue a una frase) y `PLAN_FEATURE_STATE_LABELS` la etiqueta accesible («Incluido, próximamente» / «No incluido, próximamente»). |
| Matriz en el DOM | Una `<table>` con `w-1/4` (28% en móvil) para «Función», `<th scope="col">` por plan (con «Plan actual») y `<th scope="row">` por función; celda = marca `aria-hidden` + estado `sr-only` + frase si aporta + marcador visible `aria-hidden`. |

## Enumeración de estados responsive (obligatoria)

| Estado | Mobile (< md, 320–767) | Desktop (≥ md) |
| ------ | ---------------------- | -------------- |
| Anónimo | Matriz completa: «Función» + Pro, Free, Basic; marca encima del texto, «Próximamente» visible y el valor propio del plan; sin marca de plan actual | Igual, con la marca al lado del texto |
| Autenticado (free, basic o pro) | Igual + «Plan actual» bajo el encabezado de su columna | Ídem |
| Fila «Próximamente» | Marca de inclusión + «Próximamente» (10px en móvil); el lector oye «Incluido, próximamente» / «No incluido, próximamente» | Ídem |
| Cargando (catálogo sin datos) | Sin matriz; skeletons de cards | Ídem |
| Error del API | Aviso de error de las cards; sin matriz | Ídem |
| Catálogo vacío o un solo plan | Sin matriz | Ídem |
| 320px | Cuatro columnas que envuelven con partición (`hyphens: auto`), sin overflow de página y sin filas ocultas | (no aplica) |

Paridad: ninguna fila ni columna se oculta en móvil y la matriz lleva la misma información en los dos anchos.

## Pasos ejecutados

1. TDD del catálogo: test de contrato de etiquetas (rojo) → `label` en `planFeatureSchema` + `TIER_CONFIG` (verde).
2. TDD del módulo puro: reescritura de `plan-comparison.spec.ts` para las filas completas (rojo) → `plan-comparison.ts` + los cuatro estados de `plan-feature-state.ts` (verde).
3. TDD de componentes: tests nuxt de `PlanFeatureList` (cuatro estados, marcador sin doble anuncio) y `PlanComparison` (una sola tabla, etiquetas, celdas) en rojo → componentes (verde).
4. Stub e2e con el espejo del catálogo (etiquetas incluidas) + reescritura del test de `/pricing` como matriz completa (14 filas, marcas, «Próximamente», 320px sin overflow, marca del plan actual).
5. Ajuste de layout medido: `table-fixed`, columna de función al 28% en móvil, marca encima del texto y `hyphens-auto` (el corte seco de «Próximamente» y «Ingredientes» se veía como un defecto).
6. Contraste: el encabezado «Función» y el marcador pasaron del token sutil (4.47:1, bajo AA sobre el fondo de la página) al token secundario que el repo ya ajustó para AA.
7. Verificación completa (abajo) + QA visual con `pnpm dev` y `agent-browser` a 1280 y 375, claro y oscuro.

## Verificación

| Comando / medición | Resultado |
| ------------------ | --------- |
| `pnpm --filter @recetario/stripe test` | **68 pasan** (+2 del contrato de etiquetas) |
| `pnpm --filter @recetario/web test` | **701 pasan** (53 archivos) |
| `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL pnpm --filter @recetario/api test` | **220 pasan** (sin las variables del shell; con ellas el test de portal es preexistente-frágil) |
| `playwright test --project=chromium` (suite completa) | **164 pasan** (2.7m) |
| `a11y.spec.ts` + `contrast.spec.ts` | **23 pasan** (axe claro/oscuro + sonda de contraste por píxeles) |
| `pnpm --filter @recetario/web type-check` / `pnpm lint` | limpios |
| Matriz en el DOM (e2e) | 14 filas, columnas «Función» + Pro/Free/Basic; «Duplicar recetas» con `Incluido/No incluido/Incluido`; «Exportar a PDF» con `Incluido, próximamente/No incluido, próximamente/No incluido, próximamente` y sus tres «Próximamente» visibles |
| 320px | `overflow` de página 0; las 4 columnas siguen visibles (celda 3 comprobada) y ninguna fila se oculta |
| Contraste medido | 0 fallos en `/` y `/pricing`, claro y oscuro, 375 y 1280 |
| QA visual (1280/375, claro/oscuro) | Matriz legible; «Próximamente» con guion («Próximamen-te») y valores sin cortes secos; la landing `#pricing` sin marcadores (los destacados excluyen lo próximo) |
| Capturas | `apps/web/test-results/qa-matrix/` (gitignored) |

## Revisión de cierre (`/code-review`, dos ejes sobre el diff)

| Eje | Resultado | Accionable y cerrado |
| --- | --------- | -------------------- |
| Estándares | Sin brechas duras; los tokens semánticos, el borde web→API, el registro de íconos y el espejo del stub se respetan. | El encabezado «Función» usaba la firma `tracked-uppercase` que la *One Label Rule* de `DESIGN.md` reserva a etiquetas de formulario: pasa a `text-xs font-bold` (la matriz no es un formulario). Se eliminó el helper `cellMarker` (se llamaba dos veces por celda y sólo nulificaba) precalculando el marcador en `rows`, y los cinco mapas por estado se consolidaron en `PLAN_FEATURE_PRESENTATION` (añadir un estado ya no toca cinco listas). Se descartó extraer el marcador a un componente: la lista y la matriz difieren en tamaño y contexto, y el markup son seis líneas. |
| Spec | Contrato completo: sin requisitos perdidos ni scope creep (el bloque CSRF del stub es trabajo previo sin commitear, ajeno a esta tarea, y **no** entra en los commits). | Se documentó la única desviación real (`hyphens-auto` + marca encima del texto en móvil, ya en la tabla de desviaciones) y se corrigió una imprecisión del propio spec: «Exportar a PDF» está en `included: false` también en Basic, no sólo en Free. |

Notas de la revisión que no piden cambio: el marcador visible de `PlanFeatureList` (landing/diálogo) dice «Próximamente» en los dos estados próximos y sólo la marca distingue la inclusión —es el contrato (marca = inclusión, texto = disponibilidad)— y queda anotado como deuda; las etiquetas repetidas entre el catálogo real y sus tres espejos de test siguen siendo la deuda heredada de T7 (el contrato de etiquetas protege la fuente real).

## Decisiones

| # | Decisión | Origen |
| - | -------- | ------- |
| 1 | La etiqueta de fila vive en el catálogo y es **opcional**: sólo 4 slots la declaran y el resto usa su frase (idéntica en los tres planes). | Spec (acuerdo con el usuario) |
| 2 | Las filas van en **orden del catálogo**, no «primero lo que cambia»: un solo criterio de orden y el mismo que el espejo del stub. | Spec (acuerdo con el usuario) |
| 3 | `coming_soon` **no colapsa** `included`: la marca dice la inclusión futura y el texto visible dice «Próximamente» (marcador `aria-hidden` porque la etiqueta `sr-only` ya lo dice). | Spec (acuerdo con el usuario) + hallazgo 3 del review |
| 4 | Una celda **no repite** la frase cuando es igual a la etiqueta: lo compartido se ve sólo con la marca y la fila sigue existiendo. | Spec |
| 5 | El marcador es **texto visible**, no color: «Próximamente» se lee sin depender del tono. | Spec (historia 10) |
| 6 | El ancho de la columna de función cede en móvil (28%) y la marca va encima del texto; la tipografía baja a 11px/10px sólo por debajo de `md`. | Implementación (medido a 375) |
| 7 | `hyphens-auto` en celdas y etiquetas de la matriz: el corte seco («Ingrediente/s», «Próximament/e») se leía como defecto; con `lang="es"` la partición es real y el `break-words` queda como último recurso. | Implementación (QA visual) |
| 8 | Encabezado «Función» y marcador usan el token de texto secundario (AA sobre el fondo de la página), no el sutil (4.47:1). | Gate de contraste |

## Desviaciones respecto del spec

| # | El spec decía | Se hizo | Por qué |
| - | ------------- | ------- | ------- |
| 1 | «se ajusta ancho/tipografía» para el 320 | Además se añadió `hyphens-auto` y la marca pasó encima del texto en móvil | La medición a 375 mostró cortes a mitad de palabra («Ingrediente/s») que parecen un defecto de render, no una decisión de densidad. |
| 2 | No fijaba el token del encabezado «Función» | Token secundario | El sutil no llegaba a AA (4.47:1) sobre el fondo de la página y el gate de contraste lo cazó. |

## Deuda / follow-ups

| Hallazgo | Ubicación | Nota |
| -------- | --------- | ---- |
| El estado `coming_soon`/`coming_soon_excluded` no distingue en el **texto visible** de la lista del diálogo | `features/billing/PlanFeatureList.vue` | La lista sí lo anuncia en `sr-only`; el texto visible sólo dice «Próximamente» en los dos casos (en la matriz la marca sí distingue). |
| `PlanChangeDialog` monta sus propias cards y su lista sigue en `variant="full"` | `features/billing/PlanChangeDialog.vue` | Heredado de T7; sin dueño nuevo. |
| El catálogo de prueba vive en tres sitios (stub e2e, fixture nuxt y fixtures unit) | `test/e2e/support/stub-api.mjs`, `test/nuxt/public-ui.spec.ts` | Heredado de T7; el contrato de etiquetas del paquete `stripe` protege la fuente real. |
| Abiertos del review de landings: scroller con foco de teclado, cara de marca en títulos de card, lanes de las cards y `shadow-accent-tint` | `.commandcode/design/review-report.md` | Sin cambios en esta sesión; siguen con su dueño. |
