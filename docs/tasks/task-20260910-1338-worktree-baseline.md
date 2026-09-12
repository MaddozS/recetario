# Task 1 — Worktree y baseline

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md`
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-01-worktree-baseline.md`

- **Scope:** `new`
- **Pre-existing:** rama limpia `refactor/recipe-ui-actions-financials`; commit `bf802c52`; convención `docs/tasks/task-*.md`
- **Dependencies:** ninguna
- **Parallel-safe:** no

## Resultado

| Elemento | Valor |
|---|---|
| Baseline fijado | `bf802c52a143033db3c67e41c1b5ac14fc4f8d2d` |
| Worktree | `/Users/maddozs/personal-projects/recetario-nuxt-rework` — **movido en la Task 2** desde `~/.commandcode/worktrees/recetario-be7daeb1070b/nuxt-rework` (ver Desviación 0 de `task-20260911-1758-nuxt-platform-ui.md`) |
| Rama de migración | `worktree-nuxt-rework` |
| Checkout principal | intacto: `refactor/recipe-ui-actions-financials` @ `bf802c52`, árbol limpio |
| Entorno | Node `v22.23.1`, pnpm `11.1.2` (pins de `package.json`) |

## Pasos ejecutados

1. **Pre-flight** — `git status --porcelain` vacío; `HEAD` y `origin/refactor/recipe-ui-actions-financials` ambos en `bf802c52`. Versiones de Node y pnpm coinciden con los pins.
2. **Base del worktree** — se activó `worktree.baseRef: "head"` en `.commandcode/settings.local.json` para que el worktree naciera del HEAD local (`bf802c52`) en lugar de la rama por defecto remota.
3. **Creación** — `enter_worktree` con nombre `nuxt-rework` (en sesión, sin respawn, para que Task 1 siga siendo una sola sesión).
4. **Verificación del baseline** — `HEAD` = `bf802c52`; rama `worktree-nuxt-rework`; `git merge --ff-only bf802c52…` → `Already up to date`.
5. **Archivos locales** — copiados `.env` y `.env.cloudflare` desde el checkout principal (permanecen gitignored; el árbol siguió limpio).
6. **Checks** — ver sección Verificación.
7. **ADR** — `docs/adr/0009-nuxt-frontend-rework.md`.
8. **`.worktreeinclude`** — patrones `.env` y `.env.cloudflare` para que futuros worktrees hereden la configuración local.
9. **Commits y cierre** — ver sección Commits.

## Desviaciones respecto del roadmap

### 1. `git merge --ff-only` no podía funcionar desde la base por defecto

El roadmap indicaba crear el worktree y avanzar su rama con `git merge --ff-only bf802c52…`. Eso es inaplicable: un worktree gestionado nace de la rama por defecto remota (`origin/master` = `5fc41dd`), que **no es ancestro** del baseline — merge-base `2e50213`, divergencia 368/0. Un `--ff-only` desde ahí falla con `Not possible to fast-forward`.

Solución aplicada: `worktree.baseRef: "head"`, de modo que el worktree nace directamente del HEAD local, que ya era el baseline. El `--ff-only` se conservó como **verificación** y devolvió `Already up to date`, dejando la evidencia de que el baseline quedó fijado.

**Fallback documentado** (si el ajuste no se honra en una sesión futura): `git switch -C worktree-nuxt-rework bf802c52a143033db3c67e41c1b5ac14fc4f8d2d` dentro del worktree.

### 2. `.commandcode/settings.local.json` está trackeado en git

El plan asumía que ese archivo era local (figura en `.gitignore`), pero **está trackeado** (`git ls-files` → modo `100644`; último cambio en `8cf28c4`). Git ignora las reglas de `.gitignore` para archivos ya trackeados, así que activar `baseRef` ensució el árbol tanto en el worktree como en el checkout principal.

Acción: se revirtió el archivo en **ambos** checkouts con `git checkout -- `. El ajuste `baseRef` ya había cumplido su función en el momento de creación del worktree, así que no se perdió nada. Ambos árboles quedaron limpios.

Consecuencia para sesiones futuras: para crear otro worktree desde la línea de migración hay que (a) activar `baseRef` temporalmente en el checkout principal, crear el worktree y revertir, o (b) usar el fallback `git switch -C`. Ver follow-ups.

### 3. `graphify` omitido

La preferencia vigente prohíbe usar `graphify` (y está en `disabledSkills`), así que se omitió el pre-flight de dependencias de graphify que sugiere `AGENTS.md`. Se documenta la omisión en lugar de ejecutarlo.

## Verificación

Receta replicada de `.github/workflows/ci.yml`: `pnpm install --frozen-lockfile` → `pnpm --filter @recetario/db generate` → `pnpm {lint,type-check,test,build}`.

| Comando | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | OK en 5.8 s; 640 paquetes; **`pnpm-lock.yaml` sin cambios** |
| `pnpm --filter @recetario/db generate` | Cliente Prisma 7.8.0 generado en `prisma/generated` y `prisma/generated-node` |
| `pnpm lint` | 6/6 tareas OK |
| `pnpm type-check` | 7/7 tareas OK — **0 errores, 0 warnings** (21 hints preexistentes: deprecaciones de `document.execCommand`, `ArrowUpCircle`, y variables sin usar) |
| `pnpm test` | 10/10 tareas OK — **299 tests pasan**: web 14, api 170, db 39, stripe 66, auth 10 |
| `pnpm build` | 7/7 tareas OK — build Astro completo |
| `git status --porcelain` (tras todo) | vacío |
| `git -C <checkout principal> status --porcelain` | vacío |

Notas:

- El cliente Prisma **no existe** en un worktree limpio (`packages/db/prisma/generated` está gitignored), por eso `generate` es un paso obligatorio antes de cualquier check.
- Turbo reportó `using shared worktree cache` y varias tareas como *cache hit*. Para que el baseline sea evidencia de ejecución real y no de reproducción de caché, se repitió con `--force` (bypass de caché): ver *Evidencia de la corrida forzada*.

### Evidencia de la corrida forzada

La primera pasada sirvió caché compartida de worktree (`using shared worktree cache`), y una caché tibia puede enmascarar un fallo dependiente del entorno. Se repitió con bypass explícito:

```
pnpm exec turbo run lint type-check test build --force
```

Resultado: **15/15 tareas exitosas, 0 cacheadas, 14.97 s**. Ejecución real, no reproducción:

| Tarea | Evidencia |
|---|---|
| `lint` | 6 tareas OK |
| `type-check` | `astro check` → 88 archivos, **0 errores, 0 warnings**, 21 hints |
| `test` | 299 tests en 45 archivos: api 170, stripe 66, db 39, web 14, auth 10 |
| `build` | `astro build` → `Complete!`; 7 tareas OK |

Conclusión: el baseline está verde por ejecución real, no por caché.

## Paridad responsive / QA visual

**No aplica.** Task 1 no modifica UI, por lo que no hay estados responsive que enumerar (la exigencia de `AGENTS.md` aplica sólo a cambios visuales). No se levantó ningún servidor de desarrollo, así que no quedan puertos ocupados ni procesos vivos.

## Riesgos y rollback

| Riesgo | Estado |
|---|---|
| `baseRef` no honrado | No ocurrió; fallback documentado |
| Instalación pesada o fallida | No ocurrió; 5.8 s reutilizando el store compartido |
| `prisma generate` requiere env | No ocurrió; generó sin DB viva |
| Check fallando por causa preexistente | No ocurrió; los 4 checks verdes |
| Secretos copiados al worktree | `.env*` sigue gitignored; el diff staged se revisó antes de commitear |

**Rollback:** `exit_worktree` con `remove` (o `git worktree remove`) y borrar la rama `worktree-nuxt-rework`. No hay impacto en producción, en el checkout principal, ni en base de datos/migraciones/despliegues.

## Commits

Rama `worktree-nuxt-rework`, sobre el baseline `bf802c52`. Sin trailer de co-autor (preferencia de autoría limpia).

| Commit | Contenido |
|---|---|
| `0febdeb` | `chore(worktree): incluir archivos locales ignorados en nuevos worktrees` — agrega `.worktreeinclude` |
| _(este commit)_ | `docs(nuxt): registrar el ADR del rework de frontend y la task 01` — `docs/adr/0009-nuxt-frontend-rework.md` y este task file |

Ambos commits se verificaron libres de secretos (`.env`/`.env.cloudflare` siguen gitignored y no entraron al índice).

**HEAD final:** `71f1eed` (`docs(nuxt)…`) — o su hash reescrito si este task file se enmienda.

## Follow-ups para la siguiente sesión

1. **Crear worktrees de Tasks paralelas desde la línea de migración.** El ajuste `baseRef: "head"` no quedó persistido (ensucia un archivo trackeado). Para Tasks 2/3, 5/6, 7/8 y 11/12: activar `baseRef` temporalmente en el checkout principal, crear el worktree y revertir el archivo; o usar `git switch -C worktree-<nombre> <commit>`.
2. **Esperar a que Nuxt tenga shell verde antes de optimizar la instalación.** Task 2 modifica manifests y **no debe** correr `pnpm install`; debe pausar para que lo ejecute el usuario con pnpm 11.1.2 y actualice el lockfile (checkpoint ya previsto en el roadmap).
3. **`.worktreeinclude` ya está en la rama de migración**, así que los worktrees creados a partir de ella reciben `.env` y `.env.cloudflare` automáticamente.
4. **Inconsistencia de `.commandcode/settings.local.json`**: está trackeado pero figura en `.gitignore`. Cualquier cambio de configuración local ensucia el árbol. Candidato a `git rm --cached` en una sesión propia — fuera del alcance de Task 1.
5. **Warnings preexistentes de `astro check`** (21 hints): deprecaciones de `document.execCommand` en `InstructionsEditor.astro`, `ArrowUpCircle` en `CTASection.astro` y variables sin usar en `middleware.ts`, `ingredients.astro` y `recipes/[recipe].astro`. No bloquean; se resuelven solos al migrar cada slice.
