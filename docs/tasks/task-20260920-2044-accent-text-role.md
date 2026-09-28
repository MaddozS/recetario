# Task — T1: rol de texto del acento + gate de a11y honesto

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Predecesoras: `.commandcode/design/review-report.md` (review de las superficies públicas, veredicto **Block** 33/50) y el plan `~/.commandcode/plans/landing-review-fixes.md`, que asigna a esta sesión los hallazgos **1** (AA roto en claro), **2** (gate ciego) y **14** (`accent-950` inexistente).

- **Scope:** `extends-existing` — la rampa, el relleno sólido y los roles ya existían; faltaba el rol de **texto** y un instrumento de medida honesto.
- **Pre-existing:** `apps/web/app/utils/accent-colors.ts` (`ACCENT_SHADES`, `darkShadeMap`, `solidShades`, `getAccentCssVars`), `apps/web/app/assets/css/tokens.css` (puentes `--color-accent-*`), `apps/web/test/unit/accent-colors.spec.ts` (helpers `contrast`, `luminance`, `shadeOf`), `apps/web/test/e2e/a11y.spec.ts` (`settle`, `scan`, `blocking`).
- **Dependencies:** — (T1 es la primera del plan).
- **No hizo:** tocar los usos de acento como **icono** (spinners, breadcrumbs, checkboxes: umbral 3:1, siguen con la rampa), ni el acento de las superficies privadas.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, worktree `worktree-nuxt-rework`. `firefox-smoke` no arranca en esta máquina (`sandbox_extension_issue_file_to_process`), igual que en la sesión del fix CSRF: los gates corrieron en chromium.

## Resultado

- **Rol de texto del acento:** `--aw-accent-text` / `--color-accent-text` lo emite `getAccentCssVars()` (claro: paso 800 de la familia; oscuro: el tono al que ese 800 mapea, el 300) y `tokens.css` lo expone como `text-accent-text`. Re-apuntados los **5 usos de texto** del acento en las públicas: h1 del hero, eyebrow de "cómo funciona", enlace activo del navbar, hover del drawer y la regla `a[data-spy-active]`.
- **Card Pro en oscuro:** `dark:bg-accent-950/10` (token inexistente: 0 px pintados) pasa a `dark:bg-accent-800/10`. Medido por computed style: `oklab(0.807904 0.0906622 0.0404466 / 0.1)` frente a `oklch(0.208 0.008 258)` de free/basic.
- **Gate de axe:** el barrido público recorre la página **por tramos** y une los hallazgos, y corre en **claro y oscuro**; los `color-contrast` incompletos tienen que estar en `DOCUMENTED_INCOMPLETE` (regla + selector + motivo + ratio medido) o la suite falla.
- **Sonda de contraste por píxeles** (`contrast.spec.ts`): 8 tests que miden 119 nodos de texto en `/` (99 a 375) y 77 en `/pricing` a 1280 sobre el píxel renderizado, en ambos temas y ambos anchos.
- **Cuatro fallos AA reales que el review no vio**, destapados por la sonda y arreglados aquí (tabla en «Diagnóstico»): el lavado del acento y la banda CTA no estaban calibrados para el texto que va encima.

## Diagnóstico

### Por qué el gate estaba ciego (hallazgo 2)

1. **El estado, no el pliegue.** axe 4.13 analiza el documento entero: su `isOffscreen` sólo descarta lo que está fuera por izquierda/derecha o lo `position: fixed` pasado del borde inferior. Lo que se escapaba era el **estado**: `a[data-spy-active]` sólo existe mientras su sección está en viewport, así que sin scrollear axe no tenía nada que medir (no es que lo midiera mal). Por eso el arreglo es un barrido **por tramos con unión de hallazgos**: recorrer y volver arriba deja el enlace otra vez inactivo y reintroduce el agujero.
2. **`incomplete` era un agujero silencioso.** 21–41 nodos por barrido quedaban fuera de `violations` (axe no puede componer fondos con `background-image`), y el spec sólo miraba `violations`.

### Lo que la sonda encontró (y el review no)

| Nodo                                 | Medición (píxel)                                        | Causa                                                                  | Arreglo                                                    |
| ------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| "Conocer más" (héroe, claro)         | 4.30:1 (necesita 4.5)                                   | `muted-foreground` #5f6f84 calibrado contra fondos planos, no lavados   | `--tw-muted-fg` → `#526073` (5.12:1 en el peor punto)      |
| Entradilla de "cómo funciona" (claro) | 4.06:1                                                  | ídem, sobre el lavado `#f5e0e1`                                        | ídem                                                       |
| Descripción de paso (claro)          | 4.29:1                                                  | ídem                                                                   | ídem                                                       |
| Párrafo de la banda CTA (claro)      | 4.41:1 (blanco sobre `#c75253` renderizado)             | Los dos lavados blancos del fondo (0.12/0.07) aclaraban el relleno      | Lavados a 0.06/0.04                                        |
| Secundarios y sutil de la card Pro (oscuro) | 4.06:1 y 4.53:1 raspando                         | El tinte del hallazgo 14 mueve la superficie de la card                 | `--tw-muted-fg` 0.637→0.72 y `--tw-subtle-fg` 0.6→0.65     |

El último caso es la consecuencia directa de arreglar el hallazgo 14: mientras `accent-950` no pintaba nada, la card Pro compartía el fondo de las demás y los tokens oscuros pasaban raspando (4.53:1). Al aplicar el tinte, el gate honesto los tumbó.

## Contratos nuevos

| Contrato                                                                  | Definición                                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--aw-accent-text` / `--color-accent-text`                                | Tinta del acento sobre neutros. Claro: `800` de la familia (coral `#b33b3c`). Oscuro: el tono al que el `800` mapea, el `300` (coral `#faa7a1`). Regla medida en `test/unit/accent-colors.spec.ts` (7 familias × 2 temas ≥ 4.5:1 sobre `bg-background` y `bg-muted`/`bg-card`). |
| `measureContrast(page)` / `collectContrastFailures(page)`                  | `test/e2e/support/contrast-probe.ts`. Oculta el color del texto, captura el viewport por tramos y muestrea el píxel debajo de cada caja de línea; el peor punto decide. Umbral WCAG 2.1 (4.5:1, 3:1 en texto grande). |
| `freezeAnimations` / `scrollPositions` / `scrollTo`                        | `test/e2e/support/page-sweep.ts`: el asentado (antes `settle()`) y el recorrido, compartidos por los dos gates.                                                                                              |
| `DOCUMENTED_INCOMPLETE`                                                    | `a11y.spec.ts`: allowlist por **región** (`closest`) con regla, motivo y ratio medido. Todo `color-contrast` incompleto tiene que estar cubierto; si no, la suite falla listando los que faltan.              |

## Decisiones

| # | Decisión | Origen |
| - | -------- | ------ |
| 1 | Rol separado de la rampa aunque en coral coincida con `accent-800`: el rol es un contrato (medido en las 7 familias) y la rampa sigue sirviendo tinta, tinte, borde y decoración. | Plan (paso 2) |
| 2 | Sólo cambia el **texto**: los iconos mantienen `text-accent-600` (su umbral es 3:1 y `#e84f4f` sobre claro ya daba 3.54:1). | Plan (paso 3) |
| 3 | El barrido por tramos se aplica **sólo a las públicas**; auth, privadas y acentos siguen con `scanOnce`. axe analiza el documento entero: lo que se escapaba era el estado, y 84 escaneos × 11 análisis por página no compran nada. | Medición de esta sesión |
| 4 | La allowlist se ancla en **regiones** (`[data-landing-hero]`, `#how-it-works`, …) y no en los selectores que genera axe: el markup cambia y los targets también, pero el motivo (degradado) y el ratio medido son estables. | Esta sesión |
| 5 | La sonda mide **píxeles** en vez de componer los degradados analíticamente (lo que hizo el review): reproduce el 3.54:1 original y no depende de parsear `oklab`/`color-mix` a mano. El precio es ocultar el color para muestrear (dos pasadas) y un shim de `__name` para poder iterarla con `tsx`. | Desviación #3 |
| 6 | Los tokens de texto oscuro suben en vez de dejar el tinte de la card Pro muerto: el tinte era el arreglo pedido del hallazgo 14 y el rol de texto es el que tiene que aguantarlo. | Esta sesión |

## Pasos ejecutados

1. **TDD (rojo)**: contrato del rol de texto en `accent-colors.spec.ts` (contraste sobre las dos superficies de cada tema + valores explícitos de coral + conteo de variables). 3 tests en rojo.
2. `getAccentCssVars()` emite `--aw-accent-text` / `--color-accent-text` (`TEXT_SHADE = "800"`, mapeado en oscuro); `tokens.css` lo publica en `@theme` con fallback a la familia por defecto. Verde: 14/14.
3. Re-apuntados los 5 usos de texto (`HeroSection:31`, `HowItWorksSection:52`, `Navbar:91,142,177`).
4. `PricingSection:91`: `dark:bg-accent-950/10` → `dark:bg-accent-800/10`; verificado por computed style en ambos temas.
5. `a11y.spec.ts`: `scan()` por tramos + unión, claro/oscuro en las públicas, `DOCUMENTED_INCOMPLETE` con 5 entradas, `scanOnce` para el resto.
6. `support/page-sweep.ts`, `support/contrast-probe.ts` y `contrast.spec.ts` nuevos; los cuatro fallos AA de la tabla arreglados en tokens y en la banda CTA.
7. QA con `agent-browser` (1280/375 × claro/oscuro) y capturas en `apps/web/test-results/qa-t1/` (gitignored): héroe, "cómo funciona" con el enlace activo, planes y los dos móviles.

## Desviaciones respecto del plan

| # | Desviación | Motivo |
| - | ---------- | ------ |
| 1 | El barrido público escanea **por tramos y une**, en vez de «recorrido + vuelta arriba antes de `axe.run`». | Medido: al volver arriba el enlace activo desaparece (`data-spy-active` deja de existir) y el agujero del hallazgo 2 volvía a quedar abierto. |
| 2 | Se añade `test/e2e/support/page-sweep.ts` además de `contrast-probe.ts`. | El asentado y el recorrido los necesitan los dos gates; dejarlos en uno obligaba al otro a importar semántica ajena. |
| 3 | La sonda mide píxeles renderizados en vez de componer los degradados analíticamente. | Más honesto (incluye `color-mix`, la superposición del navbar y las imágenes) y reproduce el número del review. |
| 4 | Se tocan tokens de texto en oscuro y los lavados de la banda CTA (fuera del plan). | El gate honesto los destapó al aplicar el tinte de la card Pro (hallazgo 14); dejarlos habría exigido una allowlist en la sonda, es decir otro agujero silencioso. |
| 5 | La allowlist tiene 5 entradas por región en vez de una por nodo. | 41 nodos de axe por barrido en móvil oscuro; la región + el ratio medido documenta lo mismo sin atarse a los selectores generados. |

## Verificación

| # | Comando | Esperado | Resultado |
| - | ------- | -------- | --------- |
| 1 | `pnpm --filter @recetario/web exec vitest run test/unit/accent-colors.spec.ts` | Contrato del rol | ✅ 14/14 |
| 2 | `pnpm --filter @recetario/web test` | `unit` + `nuxt` | ✅ 670 tests / 50 ficheros (2 nuevos en `accent-colors.spec.ts`) |
| 3 | `pnpm --filter @recetario/web type-check` · `pnpm --filter @recetario/web lint` | Limpios | ✅ |
| 4 | `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL pnpm --filter @recetario/web exec playwright test test/e2e/a11y.spec.ts test/e2e/contrast.spec.ts --project=chromium` | Barrido (incluye `pública /` en claro y oscuro) y sonda | ✅ 23 tests en 1.3 min |
| 5 | **Prueba de mutación**: `text-accent-text` → `text-accent-600` en el navbar activo | Los dos gates deben fallar | ✅ `pública /` falla y la sonda reporta **3.54:1** ("Funciones", `rgb(232,79,79)` sobre `rgb(248,250,252)`, 14px): el número exacto del review |
| 6 | QA visual `agent-browser` 1280/375 × claro/oscuro | Colores del rol y card Pro | ✅ spy `rgb(179,59,60)` / `rgb(250,167,161)`, h1 ídem, card Pro `oklab(… / 0.1)` frente a `oklch(0.208 0.008 258)`; móvil sin overflow (`scrollWidth === clientWidth`) |
| 7 | Ratios medidos con la sonda | Criterio del plan | ✅ `a[data-spy-active]` **5.56:1** (era 3.54), eyebrow **4.77:1** (era 3.02), h1 **4.69:1** (era 3.05); oscuro 4.73–9.40:1 |
| 8 | `docs`/plan: hallazgos 1, 2 y 14 | Cerrados | ✅ Rol de texto, gate con scroll + allowlist, token inexistente sustituido |

## Riesgos y rollback

| Riesgo | Mitigación |
| ------ | ---------- |
| El barrido público tarda 9.7 s en `/` (4 escaneos × 11 tramos). | Es el precio de que el gate vea el estado; si crece, subir el paso de `scrollPositions` (hoy 0.75×viewport). |
| La allowlist de `incomplete` puede crecer con nuevo markup decorativo. | Si crece, es deuda nueva: el spec falla y lista los nodos sin documentar. |
| Subir los tokens de texto oscuro cambia el tema oscuro de toda la app. | Sólo sube contraste (de 4.53:1 a ~5.5:1); la suite de acentos sigue verde. |
| Rollback | Revertir el commit del rol devuelve los 5 usos al `600`; la prueba de mutación es la evidencia de que el gate vuelve a rojo con él. |

## Commits

| Commit | Contenido |
| ------ | --------- |
| `test(web): contrato de contraste del acento como texto` | `test/unit/accent-colors.spec.ts` |
| `fix(web): rol de texto del acento y gate de a11y con scroll` | `utils/accent-colors.ts`, `assets/css/tokens.css`, los 5 componentes del landing, `test/e2e/a11y.spec.ts`, este task file |
| `test(web): sonda de contraste con degradados compuestos` | `test/e2e/contrast.spec.ts`, `test/e2e/support/contrast-probe.ts`, `test/e2e/support/page-sweep.ts` |

## Hallazgos abiertos y quién los atiende

| # | Hallazgo | Dónde se manifiesta | Dueño | Cómo se cierra |
| - | -------- | ------------------- | ----- | -------------- |
| 1 | La sonda cubre `/` y `/pricing`; las superficies privadas sólo tienen axe (sin sonda de píxeles). | `contrast.spec.ts` | T2/T3 o pase siguiente | Apuntar `measureContrast` a las privadas con la sesión del stub; el módulo ya está listo para eso. |
| 2 | Los estados `hover`/`focus` no se miden: la sonda juzga el reposo y el estado que toma solo (enlace activo del scroll-spy). | Pistas y hovers del landing | Pase de interacción (T4) | Forzar `:hover`/`:focus` por CSS inyectado en la sonda cuando la tarea toque esos estados. |
| 3 | `firefox-smoke` no arranca en esta máquina. | `playwright test --project=firefox-smoke` | CI | El job `e2e` de `ci.yml` instala navegadores con `--with-deps`. |
