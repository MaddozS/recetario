# Task — T5: hero con prueba real y tipografía de marca

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Predecesoras: `.commandcode/design/review-report.md` (review de las superficies públicas, veredicto **Block** 33/50), el plan `~/.commandcode/plans/landing-review-fixes.md` —que asigna a esta sesión los hallazgos **6** (el hero gasta su mitad en el logo y la prueba está al 28%) y **7** (Outfit se pide pero no se usa)— y las tareas ya cerradas `docs/tasks/task-20260920-2044-accent-text-role.md` (T1), `docs/tasks/task-20260920-0907-landing-a11y-semantics.md` (T2), `docs/tasks/task-20260920-1017-plan-card-shell.md` (T3) y `docs/tasks/task-20260920-1046-lightbox-zoom.md` (T4).

- **Scope:** `new` asset + `extends-existing` composición. Se sustituye la columna visual del hero (el logo a 288px) por una ventana con una captura real del producto, y se aplica la tipografía de marca a los titulares del landing.
- **Pre-existing:** `landing/HeroSection.vue` (grid `lg:grid-cols-[1fr_auto]` con la columna `hidden lg:flex` del logo), capturas del producto `public/{receta,ingredientes,produccion}_{light,dark}.webp` (1600×810, usadas en `#features`), `--font-display: "Outfit"` en `assets/css/tokens.css` con la fuente ya pedida en `nuxt.config.ts:82`, `.landing-heading` (sólo `text-wrap: balance`) en `layouts/public.vue`.
- **Dependencies:** T1, T2, T3 y T4 (cerradas). T5 toca `HeroSection.vue` y los cinco componentes del landing; se ejecutó al final del lane para no reescribir archivos abiertos.
- **No hizo:** el copy del hero y del cierre (T6) y el relayout de la comparación de planes (T7).
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, worktree `worktree-nuxt-rework`, `pnpm dev` con datos reales. Gates en chromium (`firefox-smoke` sigue sin arrancar en esta máquina: `sandbox_extension_issue_file_to_process`).

## Resultado

- **El primer viewport ya lleva prueba, no logo.** La columna derecha es una ventana con la captura del producto: título de la receta, las cuatro métricas de costo, los tabs y la primera fila de ingredientes. Medido a 1280: la ventana mide **480×394** y su captura se ve a **0.60** de escala (480/801), así que los valores de dinero (24px en la app) se leen a ~14px; antes el hero no tenía ninguna imagen y la prueba vivía 1.5 pantallas abajo al **28%**.
- **La captura es a medida y nativa 2x, no un reescalado.** `public/hero_{light,dark}.webp` miden **1682×1378** y pesan **49,6 KB / 45,3 KB** (webp q82, por debajo del tope de 200 KB del plan). Es un recorte de 841×689 CSS px de la vista de receta, capturada a DPR 2 (2200×1640) y sin reescalar: 2 px de imagen por px de CSS.
- **La prueba también existe en móvil, en el orden que fija el plan.** `titular → párrafo → 2 CTA → captura → tarjeta de costo → nota`, medido por orden de documento (no por CSS `order`): a 375 la captura mide **312×256** (0.39 de escala, con los valores de dinero a ~9px) y entra en el primer viewport (fracción visible > 0.5, asertado en el e2e).
- **El titular es de marca y no depende del sistema operativo del visitante.** `document.fonts.check('900 88px Outfit')` → **true** en `/`; el box del h1 es **idéntico** con Outfit y con la pila de sistema (657×251 a 1280, medido forzando `--font-display`), así que el intercambio de fuente no puede desplazar nada.
- **Ningún ancho desborda y ninguna composición se rompe.** `scrollWidth - clientWidth === 0` a 320, 375, 768, 1024, 1280, 1440 y 1536.

Medidas por ancho (ventana de la captura y alto del hero):

| Viewport     | Ventana (CSS) | Alto del hero | h1  | Overflow |
| ------------ | ------------- | ------------- | --- | -------- |
| 320×800      | 257×211       | 1034          | 3   | 0        |
| 375×812      | 312×256       | 1050          | 3   | 0        |
| 768×900      | 576×472       | 1247 (1 col.) | 2   | 0        |
| 1024×800     | 416×341       | 877           | 3   | 0        |
| 1280×900     | 480×394       | 955           | 3   | 0        |
| 1440×900     | 480×394       | 955           | 3   | 0        |
| 1536×900     | 544×446       | 987           | 3   | 0        |

## Enumeración de estados responsive (obligatoria)

| Estado                | Mobile (375)                                                   | Desktop (1280)                                                       |
| --------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Hero, claro           | Titular → párrafo → 2 CTA → **captura** (`hero_light`) → tarjeta de costo → nota | Titular + párrafo + CTA + tarjeta de costo a la izquierda, **captura** (`hero_light`) en la derecha |
| Hero, oscuro          | Igual, con `hero_dark.webp`                                     | Igual, con `hero_dark.webp`                                          |
| Captura ausente (alt) | El `img` declara 1682×1378 y un `alt` descriptivo: si el asset falla queda el hueco con el texto, no un hueco mudo | Ídem                                                |
| Reveal                | La captura se revela con `v-reveal="'scale'"` cuando entra en viewport (bajo el pliegue) | Se revela en el primer frame (la ventana ya está en viewport) |
| Zoom de texto (200%)  | La ventana es `w-full max-w-xl` en columna única: crece con el ancho, sin recortes | La columna `auto` mide 26/30/34rem por breakpoint; el texto izquierdo cede el `1fr` |

Paridad móvil/escritorio: la captura, la tarjeta de costo, la nota y los CTA existen en los dos anchos y en los dos temas; móvil sólo reordena (la captura sube antes de la tarjeta) y reduce el tamaño de la ventana. No se omite información de escritorio en móvil.

## Contratos nuevos

| Contrato                     | Definición                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ventana de prueba del hero   | `[data-landing-hero] img`; `src` = `/hero_light.webp` \| `/hero_dark.webp` según `useTheme().isDark` (mismo patrón que `FeaturesSection`); `width="1682" height="1378"` declarados (sin CLS); `alt` descriptivo; marco `border-border rounded-2xl shadow-accent-tint`. |
| Colocación en el grid        | El hero es un grid de 2 columnas en `lg+`: texto (`col 1, row 1`), **ventana** (`col 2, rows 1-2`) y tarjeta de costo + nota (`col 1, row 2`). El orden del DOM es el orden móvil; `lg:col-start/row-start` sólo recoloca en escritorio. |
| Titulares con la fuente de marca | `.font-display` (utilidad de Tailwind sobre `var(--font-display)`, verificado) en el `h1` del hero y en los `h2` de `#features`, `#how-it-works`, `#pricing` y `#cta`. Los párrafos siguen en la pila de sistema. |

## Diagnóstico

### Hallazgo 6 — el hero gastaba media pantalla en el logo

La columna visual era `/kitchcalc_logo.svg` a 288×288 en `lg+` y **no existía** por debajo de 1024px: en móvil el primer viewport no mostraba ni una imagen del producto. La prueba real (capturas de 1600px) vivía en `#features` al 28% de escala (448×228), donde los números no se leen.

Lo que se hizo: la columna pasa a ser una captura del producto recortada al ancho del contenido (801 CSS px: título + métricas + tabs + primera fila de ingredientes), en una ventana con marco semántico, y **se muestra también por debajo de 1024px** — en móvil va a ancho completo tras los CTA y antes de la tarjeta de costo, con la misma información.

Comparación medida de la escala a la que se ve la evidencia:

| Superficie                     | Antes                              | Ahora                                  |
| ------------------------------ | ---------------------------------- | -------------------------------------- |
| Hero en móvil (375)            | sin imagen                         | 312px de ancho (0.39 de escala)        |
| Hero en escritorio (1280)      | logo de 288px (sin producto)       | 480px de ancho (0.60 de escala)        |
| Captura de `#features` (1280)  | 448px (28%)                        | igual (no se tocó)                      |

### Hallazgo 7 — la tipografía de marca no llegaba a las públicas

`--font-display` sólo se usaba en tarjetas del producto (`FixedCostCard`, `PresentationCard`); el display del landing resolvía a `-apple-system`. Ahora los seis titulares del landing (h1 del hero + cinco h2) declaran `font-display`, y la verificación es una medida, no una impresión:

- `document.fonts.check('900 88px Outfit')` → `true` (antes `false`).
- **CLS 0** en la carga de `/` (PerformanceObserver de `layout-shift`, sin entradas).
- Geometría del h1 con Outfit vs. con la pila de sistema: **657×251 en ambos casos** (override de `--font-display` medido en vivo; la utilidad resuelve por variable, comprobado con un `span.font-display` de prueba). Es decir: el intercambio de fuente no cambia el número de líneas ni el alto del bloque.

## Cómo se produjo la captura (reproducible)

1. `pnpm dev` (web 4321 + API 8787, datos reales de Prisma).
2. Sesión de QA en `agent-browser` con la cuenta de pruebas `qa@example.com` (`pnpm --filter @recetario/db seed:test-users --email qa@example.com --password Temporal123! --name "QA Prueba" --plan pro_monthly`; ya existía con plan Pro).
3. **La receta de la captura se creó en la cuenta de QA, no se movió ninguna receta del usuario.** Se replicó por API (12 ingredientes con los precios y unidades del seed, sus cantidades, un costo fijo `Gastos Operativos` 30% y tres presentaciones) la receta `Panqué de Plátano`; quedó como `recipe id 124` con `$68.34` de insumos, `$20.50` de costos fijos, `$88.84` totales y `50%` de margen. Añadir filas de QA es el flujo que ya documenta `docs/qa-agent-browser.md`.
4. `agent-browser set viewport 1100 820 2` (DPR 2 → 2200×1640) sobre `/recipes/124`, en claro y en oscuro (cookie `kitchcalc-theme`), con `scrollTo(0,0)` y `wait --load networkidle`.
5. `ffmpeg -vf crop=1682:1378:464:182` (el rectángulo del contenido medido con `getBoundingClientRect`: x 232→1073, y 91→780 en CSS) y `cwebp -q 82`. Ni reescalado ni retoque: es el render real del producto.

## Verificación

| Comando                                                                                            | Resultado                                                        |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm --filter @recetario/web test` (base, antes de tocar nada)                                       | 677 tests / 50 ficheros en verde                                  |
| `pnpm --filter @recetario/web test` (después)                                                        | 677 en verde                                                      |
| `pnpm --filter @recetario/web type-check`                                                            | limpio                                                            |
| `pnpm --filter @recetario/web lint`                                                                  | limpio                                                            |
| `env -u WEB_ORIGIN … playwright test test/e2e/public.spec.ts test/e2e/a11y.spec.ts test/e2e/contrast.spec.ts --project=chromium` | **40/40** (17 de `public` —con el test nuevo—, 15 de a11y, 8 de contraste) |
| `agent-browser eval` con PerformanceObserver (`layout-shift`)                                         | CLS 0, cero entradas                                              |
| `agent-browser eval "document.fonts.check('900 88px Outfit')"`                                        | `true`                                                            |
| Medición de overflow a 320/375/768/1024/1280/1440/1536                                                | `scrollWidth - clientWidth === 0` en todos                        |

QA visual (evidencia en `apps/web/test-results/qa-t5/`, gitignored; **Playwright borra `test-results/` al arrancar**, así que las capturas se hicieron después del último run): `01-hero-1280-light`, `02-hero-1440-light`, `03-hero-1280-dark`, `05b-hero-375-light-top`, `06-hero-375-light-card`, `07-hero-375-dark-card`.

### Visual QA

- **Escritorio (1280/1440):** la ventana con la captura ocupa la derecha, alineada al centro del bloque de texto; el h1 en Outfit a 3 líneas; el marco (borde semántico + `shadow-accent-tint`) la separa del lavado del hero sin competir con la tarjeta de costo. Sin recortes ni elementos cortados.
- **Móvil (375):** el orden es titular → párrafo → CTA → captura → tarjeta de costo → nota; la captura va a ancho completo con el mismo marco y la tarjeta de costo queda entera debajo. La sección siguiente asoma tras la nota (cliffhanger conservado en móvil).
- **Paridad:** misma información en móvil y escritorio (la captura no se oculta en ningún ancho, a diferencia de antes); el único cambio es el tamaño y el orden.
- **Temas:** claro usa la captura clara y oscuro la oscura, sin destello de tema equivocado (el SSR resuelve `isDark` con la cookie antes del primer paint, igual que en `#features`).
- **Iconos/imágenes:** la imagen decodifica (`naturalWidth` 1682, asertado en el e2e); no hay imágenes rotas.

## Desviaciones

1. **La captura es un recorte del contenido (801 CSS px), no la ventana completa del navegador.** Con la ventana completa el texto del producto cae al ~30% de escala, que es exactamente lo que el hallazgo 6 señala; el recorte es lo que sube la evidencia a 0.60 en escritorio.
2. **`font-display` se aplica por componente, no desde la clase compartida `.landing-heading`** (el plan listaba `layouts/public.vue` como archivo a tocar). `.landing-heading` la usan también los `h1` de `/privacy` y `/terms` —fuera del alcance del hallazgo 7— y el párrafo del hero, que por decisión del plan debe quedarse en la pila de sistema.
3. **No se añadió el preload de Outfit en `nuxt.config.ts`.** El plan lo marcaba como opcional; la medición (CLS 0 y box idéntico con y sin la fuente) muestra que el intercambio no desplaza contenido, así que hardcodear una URL de `fonts.gstatic.com` habría sido deuda sin beneficio medido.
4. **Se añadieron filas de QA al entorno local** (12 ingredientes + la receta 124 + 3 presentaciones + 1 costo fijo) para capturar con datos reales sin tocar las recetas del usuario. Documentado arriba para poder reproducirlo o limpiarlo.
5. **El elemento de la ventana no lleva `reveal-item`** (sí `v-reveal="'scale'"`, como el logo anterior): mantener los dos mecanismos de reveal anidados sumaba dos opacidades sobre la misma imagen.
