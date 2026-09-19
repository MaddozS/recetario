# Task 2 — Fundación Nuxt 4, tooling y capa de UI compartida

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 2)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-02-platform-ui.md`

- **Scope:** `extends-existing`
- **Pre-existing:** `apps/web/package.json`, Tailwind 4 + tokens/global CSS, componentes Astro `atoms|molecules|organisms|templates`, Turbo, Wrangler y Vitest.
- **Dependencies:** Task 1 (completada) — baseline `bf802c52`, HEAD de partida `cf7225a`.
- **Parallel-safe:** sí, con Task 3 — esta sesión sólo implementó Task 2.

## Resultado

`apps/web` compila, type-checkea, testea y buildea con **Nuxt 4 + Vue** como build principal. El árbol Astro (`apps/web/src/**`, `astro.config.mjs`) queda intacto como referencia y fuera de build/lint/type-check/test. Se portó **sólo la capa de UI realmente compartida** (13 componentes) y se montó el router completo con 15 páginas placeholder.

| Elemento | Valor |
|---|---|
| Worktree | `/Users/maddozs/personal-projects/recetario-nuxt-rework` (**movido**, ver Desviación 0) |
| Rama | `worktree-nuxt-rework` |
| HEAD base de la Task | `cf7225a` |
| Entorno | Node `v22.23.1`, pnpm `11.1.2` (pins), Nuxt `4.5.2`, Vue `3.5.42`, Vitest `5` |
| Build Nitro | `.output/server/index.mjs` + `.output/public` — 548 kB (187 kB gzip) |
| Tests web | 62 (unit 12, nuxt 50) en 3 archivos |

## Desviación 0 (prerrequisito de sesión): worktree movido

El plan fijaba el worktree en `/Users/maddozs/.commandcode/worktrees/recetario-be7daeb1070b/nuxt-rework`. **Toda edición de archivos dentro de `.commandcode/` dispara prompt de permiso** (el estado del agente vive ahí: `settings.json`, `auth.json`, `plans/`), así que la sesión se interrumpía a cada escritura.

Acción (aprobada por el usuario):

```bash
git worktree move \
  /Users/maddozs/.commandcode/worktrees/recetario-be7daeb1070b/nuxt-rework \
  /Users/maddozs/personal-projects/recetario-nuxt-rework
```

- `git worktree move` arrastró el árbol completo, incluidos los cambios sin commitear y los `.env` gitignored; `git worktree list` confirma rama y HEAD correctos.
- Los prompts de escritura desaparecieron (verificado con la edición que antes había sido denegada).
- Shell y herramientas de archivo siguen resolviendo al path nuevo; los comandos en background necesitan `cwd` explícito porque el cwd de spawn quedó obsoleto.
- **Consecuencia para sesiones futuras:** crear los worktrees de Tasks paralelas con `git worktree add <path-fuera-de-.commandcode>` en lugar de `enter_worktree` (que siempre nace bajo `~/.commandcode/worktrees/`).

## Pasos ejecutados

1. **F1 — Manifests y tooling.** `apps/web/package.json` (scripts → Nuxt, +`nuxt`, +`@lucide/vue`, +tooling de test), `nuxt.config.ts`, `tsconfig.json` (references a los tsconfig generados), `eslint.config.mjs` (flat + vue + ts), `wrangler.nuxt.jsonc`, `turbo.json` (outputs `.output/**`, `.nuxt/**`), `.gitignore`, nota en `AGENTS.md`.
2. **F2 — CSS/tokens/util.** `tokens.css` verbatim, `global.css` (import de tokens ajustado + bloque `@source`), `app/utils/accent-colors.ts`.
3. **F3 — UI compartida.** `icon-registry.ts` + 13 componentes en `app/components/ui/{atoms,molecules,organisms}` con el vocabulario y las clases del original.
4. **F4 — Shell y rutas.** `app.vue`, `layouts/default.vue`, `error.vue` y 15 páginas placeholder (las 6 privadas usan `SectionHeading`/`Card`/`Badge` para probar el port en SSR + hidratación).
5. **F5 — Tests.** `vitest.config.ts` (projects `unit` node + `nuxt`), `playwright.config.ts`, `test/unit/**`, `test/nuxt/**`, `test/e2e/**`.
6. **Instalación.** Ver Desviación 8 (el checkpoint humano se satisfizo como efecto colateral).
7. **Verificación completa** (10 puntos) + **QA visual** 375/1280 en claro/oscuro.

## Desviaciones respecto del plan

| # | Desviación | Motivo |
|---|---|---|
| 0 | Worktree movido fuera de `.commandcode/` | Prompts de permiso en cada escritura |
| 1 | `@import "tailwindcss" source(none)` (el plan decía import verbatim) | Sin `source(none)`, Tailwind escanea todo el monorepo (árbol Astro incluido) y el bloque `@source` sería aditivo, no determinista |
| 2 | Registro de **56** íconos, no 51 | El plan contó sólo `lucide:*`; faltaban `arrow-left`, `log-out`, `save` (vienen por `icon="…"` sin prefijo) y se agregaron `eye`/`eye-off` para `PasswordInput` |
| 3 | 3 claves apuntan al nombre **canónico** de lucide | `@lucide/vue@1.45` ya no exporta los alias deprecados: `alert-triangle`→`TriangleAlert`, `arrow-up-circle`→`CircleArrowUp`, `check-circle`→`CircleCheck`. `trash-2`→`Trash` porque lucide fusionó el glifo (mismo trazado que `@lucide/astro@1.28`, cero cambio visual) |
| 4 | `accent-colors.ts` no es verbatim puro | Nuxt activa `noUncheckedIndexedAccess`: se tiparon `darkShadeMap` (`Record<AccentShade, AccentBaseShade>`) y `accentBaseColors` para que compile en strict |
| 5 | `Icon.size` es `number`, no `number \| string` | `LucideProps.size` sólo acepta number; ningún llamado usaba string |
| 6 | Cast del plugin de Tailwind en `nuxt.config.ts` | `@tailwindcss/vite@4.3.0` se tipa contra Vite 7 y Nuxt 4.5 usa Vite 8 (rolldown-vite): la identidad del tipo `Plugin` difiere, el runtime no |
| 7 | 4 reglas de `flat/recommended` desactivadas + `vue/require-default-prop` | ESLint reescribía lo que `pnpm format` (Prettier) revierte. Desactivadas exactamente las que se quejaban del formato de Prettier: `singleline-html-element-content-newline`, `max-attributes-per-line`, `html-self-closing`; `require-default-prop` es falso positivo con `defineProps<T>()` |
| 8 | El **checkpoint de instalación** se satisfizo implícitamente | `pnpm exec` (usado para Prettier/eslint/vitest) reconcilió el lockfile e instaló `nuxt`/`@lucide/vue`. `pnpm install --frozen-lockfile` → `Already up to date`, así que el lockfile quedó validado con el pnpm pinneado y se commitea con el tooling |
| 9 | e2e con `nuxtConfig: { nitro: { preset: "node-server" } }` | El output de `cloudflare_module` no arranca con Node (no levanta listener). El bundle real de Cloudflare lo cubren `nuxt build` + `wrangler:dry-run` |
| 10 | Tests con listeners mock en vez de `wrapper.emitted()` | El tracking de emits custom de VTU no registra nada en este entorno (verificado con un componente inline mínimo: sólo captura eventos nativos). Los `emit` se comprueban pasando `onAction`/`onCancel`/`onUpdate:modelValue` y afirmando el espía |
| 11 | 4º spec: `test/unit/icon-registry.spec.ts` | La tabla de riesgos del plan lo pedía ("test unitario que falla si un `name` usado no existe en el registro"); recorre `app/**` y falla si aparece un ícono no registrado |
| 12 | `noindex` también en `/` | El plan sólo marcaba las 14 rutas restantes. Mientras `/` sea la muestra del design system no debe ser indexable; lo retira la Task 5 |
| 13 | Se commitea `apps/web/.nuxtrc` | Lo genera `@nuxt/test-utils` (`setups.@nuxt/test-utils="4.3.2"`); se comprobó que se regenera solo, pero Nuxt lo documenta como archivo de configuración versionable |

## Verificación

| # | Comando | Resultado |
|---|---|---|
| 1 | `pnpm --filter @recetario/db generate` | Prisma 7.8.0 generado (worktree limpio) |
| 2 | `pnpm --filter @recetario/web lint` | **0 errores, 0 warnings** |
| 3 | `pnpm --filter @recetario/web type-check` | `nuxt typecheck` sin errores |
| 4 | `pnpm --filter @recetario/web test` | 3 archivos, **62 tests verdes** (unit 12, nuxt 50) |
| 5 | `pnpm --filter @recetario/web build` | `.output/server/index.mjs` + `.output/public` (548 kB / 187 kB gzip) |
| 6 | `pnpm --filter @recetario/web wrangler:dry-run` | Bundle válido, 640.10 KiB (168.39 KiB gzip); bindings `API`→`recetario-api`, `ASSETS`, `NODE_ENV`; sin deploy |
| 7 | `pnpm exec playwright install chromium` + `pnpm --filter @recetario/web test:e2e` | **3/3 e2e verdes** (9.9 s, build + server propios) |
| 8 | `pnpm lint && pnpm type-check && pnpm test && pnpm build` (raíz) | lint 6/6 · type-check 7/7 · test 10/10 (web 62, api 170) · build 7/7 |
| 9 | QA visual (`pnpm dev`) 375/1280 × claro/oscuro | Ver sección siguiente |
| 10 | `git status` | Sólo los archivos de esta Task; `.output/`, `.nuxt/`, `test-results/` y `.vite-cache/` correctamente ignorados |

Evidencia objetiva de tokens (vía `eval` sobre el DOM, no sólo inspección visual):

| Señal | Claro | Oscuro |
|---|---|---|
| `html.classList.contains('dark')` | `false` | `true` |
| `html.dataset.theme` | `system` (resuelto por el script anti-FOUC) | `system` |
| `--color-foreground` | `#0f172a` | token `oklch` oscuro |
| `--color-accent-600` | `#4f46e5` | idem (fallback del token) |
| Fuente mono (`UnitCostDisplay`) | `JetBrains Mono, ui-monospace, …` | idem |

El CSS generado (41 kB) contiene las utilidades escaneadas desde `app/**` (`bg-accent-600`, `min-h-11`, `w-3/4`, `backdrop:bg-backdrop/50`, `animate-[sp_…]`, `label-tracked`), lo que confirma que `source(none)` + `@source "../.."` funcionan.

## Paridad responsive / QA visual

| Condición | Mobile (375) | Desktop (1280) | Evidencia |
|---|---|---|---|
| shell placeholder | 1 columna, `p-4`, `pb-24`, skip-link accesible | `p-8`, contenedor `max-w-7xl` centrado | Capturas + `main#main-content` |
| muestra del design system (`/`) | apilada, botones `w-full`, badges en línea | grilla 2 columnas, mismas variantes y etiquetas | Capturas 375/1280 + asserts e2e |
| `Button` | mismas variantes; `iconOnly` 14 px | idéntico | Capturas; unit tests de clases |
| `Badge`/`Skeleton` | escala `sm`/`md` intacta | idéntico | Capturas |
| `Dialog` | ancho `calc(100vw - 2rem)`, cierre por backdrop/Escape | `max-w-md` centrado | e2e: abre, Escape cierra |
| `FeedbackAlert` | mensaje + lista apilados | idéntico | Capturas |
| `EmptyState` | CTA sin `actionHref` visible (`lg:hidden`) | CTA oculto, botón `action` no duplicado | Captura 1280 (CTA ausente) y 375 (visible) + assert e2e |
| error 404/servidor | mismo mensaje, causa y CTA | idéntico, status HTTP real | `app/error.vue` |
| tema claro/oscuro | tokens `.dark` resueltos pre-paint | idéntico | `eval` + capturas |

Sin omisión de información en móvil en ningún estado.

**Observación de paridad (no defecto):** el acento por defecto se ve **índigo** (fallback de `--color-*` en `tokens.css`) en lugar del **coral** que renderiza Astro. La Task 2 entrega el mecanismo (tokens, `htmlAttrs` estáticos `data-accent="coral"`, script anti-FOUC, `accent-colors` con tests); el **binding reactivo a sesión/preferencias/cookies es de la Task 4**, que además debe resolver el mapeo light/dark del acento en runtime. El script anti-FOUC sólo resuelve el tema al cargar (sin listener), por eso el QA oscuro requirió recargar con el media ya emulado.

Capturas (gitignored): `apps/web/test-results/qa/{375,1280}-{light,dark}[-bottom].png`.

## Riesgos y rollback

| Riesgo | Estado |
|---|---|
| `pnpm install` falla o ensucia el lockfile | No ocurrió; `--frozen-lockfile` → `Already up to date` |
| Peer `rolldown` de Nuxt 4.5.2 | No ocurrió; pnpm instaló peers |
| `defineVitestProject` con Vitest 5 | Funcionó; no hizo falta el fallback `vitest@^4.1` |
| Tailwind escanea el monorepo / no detecta `app/**` | Resuelto con `source(none)` + `@source "../.."`; verificado en el CSS generado |
| `.output/`/`.nuxt/` ensucian el árbol | Ignorados antes del primer build; `git status` limpio |
| Redirect de Nitro rompe el deploy Astro | `deployConfig` desactivado + dry-run con config propio |
| Íconos faltantes en el registro | 56 registrados; test que recorre `app/**` y falla si falta uno |
| `nuxt typecheck` con TS 6.0.2 | Sin errores; `vue-tsc@3.3` |
| Playwright sin navegadores | `playwright install chromium` ejecutado (faltaba v1234) |
| `emitted()` de VTU no registra eventos | Tests migrados a listeners mock |

**Rollback local:** `git checkout --` de los archivos modificados + borrar los nuevos (`app/**`, `nuxt.config.ts`, `playwright.config.ts`, `wrangler.nuxt.jsonc`, `test/**`, `.nuxtrc`) + revertir el lockfile. El árbol Astro nunca se modificó, así que el baseline sigue construible. Sin impacto en DB, deploy ni producción. En última instancia, descartar el worktree.

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit | Contenido |
|---|---|
| `chore(web): incorporar el tooling de Nuxt 4 y Vitest 5` | manifests, `nuxt.config.ts`, tsconfig, eslint, `wrangler.nuxt.jsonc`, turbo, gitignore, `.nuxtrc`, lockfile |
| `feat(web): portar la capa de UI compartida a componentes Vue` | tokens/CSS, `accent-colors`, `icon-registry`, 13 componentes |
| `feat(web): montar el shell Nuxt con rutas placeholder` | `app.vue`, layout, `error.vue`, 15 páginas |
| `test(web): configurar Vitest Nuxt y Playwright base` | configs + specs |
| `docs(nuxt): registrar la task 02` | este task file, nota en `AGENTS.md`, nota de move en el task 01 |

## Follow-ups para las próximas sesiones

1. **Task 4** es dueño del binding reactivo de tema/acento (cookies + preferencias) y debe consumir `app/utils/accent-colors.ts` sin reescribirlo: hoy el acento visible es el fallback índigo, no coral.
2. **Task 4** debe declarar `@recetario/types` en `nuxt.config` (transpile/paths) al ser el primer consumidor de un paquete workspace de TS crudo.
3. **Task 4**: el layout privado necesita `private, no-store` + `noindex`; hoy cada placeholder declara su propio `robots`.
4. **Task 5** retira el bloque de muestra del design system de `app/pages/index.vue` y quita el `noindex` de `/` (los demás placeholders lo mantienen hasta su slice).
5. **Task 11** implementa el 301 de `/settings/billing` → `/settings?tab=billing` preservando query.
6. **Task 13**: elimina el árbol Astro y `astro.config.mjs`, mueve `cloudflare-build` y `wrangler.jsonc` al output Nitro (borrando `wrangler.nuxt.jsonc`), retira `prettier-plugin-astro`, `eslint-plugin-astro` y el resto del tooling Astro.
7. **Deuda menor:** `UpgradePrompt` conserva el typo del original ("Funcion no disponible") por paridad; `astro.config.mjs` no pasa `prettier --check` desde antes de esta Task. Ambos fuera de alcance.
8. **Worktrees futuros:** crearlos fuera de `~/.commandcode/` (ver Desviación 0); `enter_worktree` siempre los crea ahí y dispara prompts de permiso.
9. **Deuda diferida (heredada de Task 1):** 11 nombres de íconos de `scripts/generate-icons.mjs` ya no se usan y el script apunta a `packages/ui/src/icons` (path inexistente).
