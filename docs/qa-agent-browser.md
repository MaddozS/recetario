# Guía de QA con Agent Browser

Guía práctica para que agentes de IA (Command Code, etc.) ejecuten pruebas
end-to-end de la app con [agent-browser](https://github.com/agent-browser/agent-browser).
Cubre: creación de usuarios de prueba, suscripciones, recetas (con ingredientes,
presentaciones y costos fijos), ingredientes con variantes, el Planificador de
Producción y Configuración.

> **Importante**: esta guía asume que ya tienes `agent-browser` instalado
> (`npm i -g agent-browser && agent-browser install`) y el dev server corriendo
> (`pnpm dev` → web en `localhost:4321`, API en `localhost:8787`).

> **Nota (Task 4)**: el shell privado ya es Nuxt. `pnpm dev` en `apps/web`
> sincroniza `.dev.vars`, limpia `.vite-cache/web` y sirve en `localhost:4321`;
> el `/sign-in` de la UI todavía es placeholder (Task 6), así que para el QA
> autenticado entra por el relay:
> `agent-browser eval "(async () => (await fetch('/api/auth/sign-in/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'qa@example.com', password: 'Temporal123!' }) })).status)()"`.
> Los server islands (`server:defer`) ya no existen en las rutas privadas.

---

## 0. Conceptos clave

- **`AGENT_BROWSER_SESSION_NAME=<name>`**: persiste cookies/localStorage entre
  comandos. **Obligatorio** para mantener la sesión de login entre pasos.
  ```bash
  export AGENT_BROWSER_SESSION_NAME=recetario-qa
  agent-browser open http://localhost:4321/recipes
  ```
- **Flujo base**: `agent-browser open <url>` → `agent-browser snapshot -i`
  (elementos interactivos con refs `@eN`) → `agent-browser click @eN` /
  `fill @eN "texto"` → re-snapshot (los refs **caducan** tras cada cambio de
  página). Cierra con `agent-browser close --all`.
- **Los server islands** (`server:defer` en `/produccion`, `/recipes`, etc.)
  cargan asíncrono: tras `open`, espera con
  `agent-browser wait --load networkidle` y re-snapshot antes de interactuar.
- **Verificación sin UI**: `agent-browser eval "<js>"` ejecuta JS en la página
  y devuelve el resultado (útil para asserts, contar elementos, leer estado).
- **OAuth de Google no es automatizable** con cuentas de prueba; para QA usa
  **email/contraseña** (el proyecto tiene `emailAndPassword` habilitado).

---

## 1. Crear usuario de prueba (verificado, con suscripción)

### Opción A — Script de seed (rápido, recomendado)

`packages/db/prisma/seed-test-users.ts` crea un usuario con `emailVerified=true`
directo en BD (evita el flujo de verificación por email, que además falla con
dominios tipo `example.com` porque Resend los rechaza):

```bash
pnpm --filter @recetario/db seed:test-users \
  --email qa@example.com --password Temporal123! --name "QA Prueba" \
  --plan pro_monthly
```

Sin flags usa defaults: `qa-temp-<timestamp>@example.com` / `Temporal123!` /
`QA Temporal`, **sin suscripción**. Flags:

| Flag | Descripción |
|------|-------------|
| `--email <email>` | Email del usuario (default: `qa-temp-<ts>@example.com`) |
| `--password <pass>` | Contraseña (default: `Temporal123!`) |
| `--name <nombre>` | Nombre completo (default: `QA Temporal`) |
| `--plan <id>` | Suscripción activa: `basic_monthly` \| `basic_yearly` \| `pro_monthly` \| `pro_yearly` |
| `--verify-only` | Solo marca `emailVerified=true` de usuarios `qa-temp-*` existentes |

### Opción B — Por la UI (más lento, prueba el flujo real)

1. `agent-browser open http://localhost:4321/sign-up`
2. `snapshot -i` → llena `NOMBRE`, `APELLIDO`, `EMAIL`, `CONTRASEÑA`,
   `CONFIRMAR CONTRASEÑA` y pulsa "Crear cuenta".
3. **Problema conocido**: el sign-up usa `requireEmailVerification: true` y
   `sendOnSignUp: true` → manda email de verificación vía Resend. En dev el
   email es un **stub** que imprime el enlace en el stdout de wrangler
   (terminal donde corre `pnpm dev`), y Resend **rechaza dominios de prueba**
   (`example.com` → error 422). El usuario **sí se crea** en BD aunque el email
   falle.
4. Para poder loguear: marca el usuario como verificado con
   `pnpm --filter @recetario/db seed:test-users --verify-only` (o edítalo con
   Prisma, ver §1-C).

### Opción C — Manipulación directa de BD (para dar suscripción)

El cliente Prisma de scripts es `packages/db/prisma/generated-node/client`
(no `generated/client`, que es para edge/worker). Patrón usado en los seeds:

```ts
// packages/db/prisma/<script>.ts (ejecutar con pnpm --filter @recetario/db exec tsx)
import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });
import { PrismaClient } from "./generated-node/client";
import { withAccelerate } from "@prisma/extension-accelerate";
const prisma = new PrismaClient({ accelerateUrl: process.env.DATABASE_URL }).$extends(withAccelerate());

// ── Suscripción activa ─────────────────────────────────────────────
// planId debe existir en subscription_plans: basic_monthly | basic_yearly
// | pro_monthly | pro_yearly (verificar con findMany)
const u = await prisma.user.findFirst({ where: { email: "qa@example.com" } });
await prisma.subscription.upsert({
  where: { id: `qa-sub-${u!.id}` },
  update: { planId: "pro_monthly", status: "active" },
  create: { id: `qa-sub-${u!.id}`, userId: u!.id, planId: "pro_monthly", status: "active" },
});

// ── Marcar email verificado ────────────────────────────────────────
await prisma.user.update({ where: { id: u!.id }, data: { emailVerified: true } });

// ── Reasignar recetas de otro owner (para poblar QA) ───────────────
await prisma.recipe.updateMany({ where: { ownerId: "<seed-owner>" }, data: { ownerId: u!.id } });
await prisma.$disconnect();
```

**Gating por plan** (relevante para probar):
- `production_planner` → solo **basic/pro** (`/produccion` muestra UpgradePrompt en Free).
- `production_save`, `production_advanced`, `cooking_mode` → solo **pro**.
- Límites: Free = 10 recetas / 30 ingredientes; Basic = 75 recetas; Pro = ilimitado.
- El **flag de feature** se lee de la suscripción vía `/api/auth/session` con
  caché Accelerate (ttl 60s) — tras cambiar el plan, espera ~60s o usa
  `?nocache=<timestamp>` en la URL.

---

## 2. Login

```bash
export AGENT_BROWSER_SESSION_NAME=recetario-qa
agent-browser open http://localhost:4321/sign-in
agent-browser snapshot -i        # refs @e10 (email), @e13 (password), @e11 (botón)
agent-browser fill @e10 "qa@example.com"
agent-browser fill @e13 "Temporal123!"
agent-browser click @e11
agent-browser wait --load networkidle
agent-browser eval "location.pathname"   # → "/recipes" = login OK
```

> Si usas `agent-browser fill` en campos que el snapshot no lista (p. ej. inputs
> con autocomplete), llena por `eval`:
> `agent-browser eval "document.querySelector('input[type=password]').value='Temporal123!'"`

---

## 3. Ingredientes (con variantes: marca, proveedor)

### Por UI (`/ingredients`)

1. `open http://localhost:4321/ingredients` → `snapshot -i`.
2. Botón "Nuevo ingrediente" → dialog con: **Nombre**, **Unidad** (select:
   kg, g, l, ml, pza, etc.), **Precio**, **Cantidad de compra** (p. ej. 1 para
   "por kg", 500 para "por 500 g"), y opcionales **Marca** y **Proveedor**
   (las "variantes": mismo nombre base con distinta marca/proveedor).
3. Guardar → aparece en la lista. Los **precios por unidad** se calculan como
   `price / purchaseQuantity` (variantes del mismo insumo: misma unidad,
   distinto precio/marca/proveedor).

### Por API (rápido para poblar)

```bash
curl -s -X POST http://localhost:8787/api/ingredients \
  -H "Cookie: <session-cookie>" -H "Content-Type: application/json" \
  -d '{"name":"Harina de trigo","unit":"kg","price":28,"purchaseQuantity":1,"brand":"La Moderna","supplier":"Casa Santos Lugo"}'
```

Schema (`ingredientCreateSchema`): `name`, `unit`, `price` (≥0),
`purchaseQuantity` (>0), `brand?`, `supplier?`. Actualización: `PATCH
/api/ingredients/:id`. Borrado: `DELETE /api/ingredients/:id` — **bloqueado**
si el ingrediente está en uso por una receta (respuesta `{ status: "blocked",
recipes: [...] }`).

> Para obtener la cookie de sesión desde agent-browser:
> `agent-browser eval "document.cookie"` (la cookie de sesión de Better Auth es
> httpOnly — en ese caso haz el fetch dentro de `eval` desde la página, que ya
> está autenticada, en vez de `curl`).

---

## 4. Recetas (con ingredientes, presentaciones y costos fijos)

### Crear receta por API (rápido)

```js
// Desde agent-browser eval (autenticado):
fetch("/api/recipes", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Panqué de Plátano", category: "PANQUES",
    desiredMargin: 30, fixedCostsPercentage: 5 }) })
```

Devuelve `201` con el detalle (incluye `id`). Los `recipeFixedCosts` opcionales
se envían en el mismo POST: `{ name, type: "PERCENTAGE"|"AMOUNT",
base: "PER_BATCH"|"PER_UNIT"|"PER_HOUR", value, hours? }`.

### Agregar ingredientes a la receta (PATCH destructivo)

`PATCH /api/recipes/:id` **reemplaza** toda la lista de ingredientes (el
`$transaction` borra `RecipeIngredient` y recrea). Body:

```json
{
  "name": "Panqué de Plátano",
  "category": "PANQUES",
  "desiredMargin": 30,
  "fixedCostsPercentage": 5,
  "ingredients": [
    { "ingredientId": 1, "quantity": 0.5, "unit": "kg", "comment": "maduros" },
    { "ingredientId": 2, "quantity": 2, "unit": "pza" }
  ]
}
```

> **Ojo**: el mismo ingrediente **puede aparecer varias veces** (cada fila con su
> cantidad/unidad/comentario) — no hay constraint único en `(recipeId, ingredientId)`.

### Presentaciones

```js
// POST /api/recipes/:id/presentations
fetch("/api/recipes/1/presentations", { method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Panqué completo", unitsPerBatch: 12, salePrice: 180 }) })
// PATCH /api/recipes/:id/presentations/:pid  (campos opcionales)
// DELETE /api/recipes/:id/presentations/:pid
```

Costos fijos **de presentación**: `POST /api/presentations/:pid/fixed-costs`
con `{ name, type: "PERCENTAGE"|"AMOUNT", base: "PER_BATCH"|"PER_UNIT"|"PER_HOUR",
value }`.

### Por UI (`/recipes` → crear → `/recipes/:id`)

1. `open http://localhost:4321/recipes` → botón "Nueva Receta" → nombre +
   categoría.
2. En el detalle: pestaña **Ingredientes** (modo editar: picker de ingrediente
   + cantidad + unidad + notas), pestaña **Costos Fijos** ("Agregar Costo
   Fijo"), pestaña **Presentaciones** ("Nueva Presentación" → nombre, unidades
   por lote, precio de venta).
3. El **FinancialSummary** (arriba, antes de los tabs) muestra costo de
   insumos, costos fijos, total y margen.

---

## 5. Planificador de Producción (`/produccion`)

Solo visible con plan **basic** (hasta 3 recetas) o **pro** (ilimitado).

### Flujo UI (verificado)

1. `open http://localhost:4321/produccion` → `wait --load networkidle` (el
   contenido es server island, carga tarde).
2. **Selector de recetas**: lista agrupada por categoría con:
   - input **"Buscar por nombre..."** (filtra al instante, ignora acentos y
     mayúsculas; las recetas ya seleccionadas **siguen visibles** aunque no
     matcheen).
   - checkbox **"Seleccionar todas"** (estado indeterminado si hay selección
     parcial).
   - contador "N / total seleccionadas".
   - la lista tiene **scroll interno** (`max-h-[420px]`); el botón "Calcular
     producción" queda siempre visible abajo.
3. Marcar recetas → aparece en cada fila un `<select>` de presentación (si hay
   varias) y un stepper de **Mezclas** (−/+).
4. **"Calcular producción"** → cambia a **etapa de resultados** (el selector se
   oculta):
   - toolbar sticky con "N recetas · M mezclas" y botón **"Editar selección"**
     (vuelve al selector).
   - **Insumos totales** (tabla), **Resumen financiero** (4 métricas),
     **Desglose por receta** (acordeones `<details>`), **Imprimir hoja de
     producción**.
5. El recálculo es **en vivo** (debounce 60ms): cambiar mezclas en el selector
   actualiza resultados ocultos; al volver a "Calcular" ya están listos.

### Deep-links (estado en URL)

- `/produccion?recipes=<id1>,<id2>&batches=<n1>,<n2>&presentations=<pid1>,<pid2>`
  abre **directo en resultados** (selector oculto).
- Sin query params → etapa select.

### Asserts útiles vía eval

```js
// Etapa actual
document.getElementById("production-root").dataset.stage   // "select" | "results"
// Scroll interno activo
const g = document.getElementById("recipe-groups");
g.scrollHeight > g.clientHeight
// Contador del toolbar de resultados
document.getElementById("results-selection-count").textContent
// Resultado de "Seleccionar todas"
document.getElementById("select-all-recipes").indeterminate
```

---

## 6. Configuración (`/settings`)

Tres tabs (vía `?tab=`): `profile` (default), `preferences`, `billing`.

### Perfil
- Card con avatar (inicial), nombre, email y tipo de cuenta ("Cuenta de email"
  vs "Sesion de Google").
- **Cambiar nombre**: form `#change-name-form` → `POST /api/account/update-name`
  (FormData `firstName`, `lastName`). Feedback inline.
- **Cambiar email** (solo cuentas email): `POST /api/account/change-email`
  (FormData `newEmail`, `currentPassword`).
- **Cambiar contraseña** (solo cuentas email): `POST
  /api/account/change-password` (FormData `currentPassword`, `newPassword`).
  Mínimo 6 caracteres.

### Preferencias
- **Tema**: system / light / dark (botones con `data-theme-option`). Preview en
  vivo vía `html.dataset.theme` + clase `.dark`.
- **Color de acento**: 7 familias (`data-accent-option`: indigo, violet, blue,
  emerald, rose, amber, coral).
- El botón "Guardar cambios" aparece solo si algo cambió (`#save-btn-wrapper`).
  Guarda vía `POST /settings?tab=preferences` (form-urlencoded `theme`,
  `accentColor`) + setea cookies `kitchcalc-theme` / `kitchcalc-accent`.
- **Preferencias cookie-first**: en otras páginas, las cookies mandan sobre la
  sesión.

### Facturación (`?tab=billing`)
- Muestra plan actual (Free/Basic/Pro), límites de recetas/ingredientes
  restantes y planes disponibles (`/api/billing/plans`).
- Botón para **suscripción** → `POST /api/stripe/checkout` (Checkout Session,
  redirige a Stripe; en dev hay que usar tarjeta de prueba
  `4242 4242 4242 4242`).
- Botón **portal** → `POST /api/stripe/portal` (Customer Portal).
- Tras checkout: `/settings?tab=billing&success=1` + `session_id` (sync vía
  `/api/stripe/sync-session`).
- **Probar planes sin Stripe**: asigna la suscripción directo en BD (ver §1-C)
  — mucho más rápido y sin tarjetas.

---

## 7. Checklist rápida para un smoke test completo

```bash
export AGENT_BROWSER_SESSION_NAME=recetario-qa

# 1. Usuario + plan pro (BD)
pnpm --filter @recetario/db seed:test-users --email qa@example.com --plan pro_monthly

# 2. Login
agent-browser open http://localhost:4321/sign-in
# fill email/password + click "Iniciar sesión" → /recipes

# 3. Ingredientes
agent-browser open http://localhost:4321/ingredients
# crear 2-3 ingredientes (uno con marca/proveedor)

# 4. Receta con todo
# crear receta, agregar ingredientes, presentación con precio, costo fijo

# 5. Producción
agent-browser open http://localhost:4321/produccion
# buscar, seleccionar, calcular, verificar insumos + resumen, editar selección

# 6. Configuración
agent-browser open http://localhost:4321/settings          # perfil
agent-browser open "http://localhost:4321/settings?tab=preferences"  # tema/acento
agent-browser open "http://localhost:4321/settings?tab=billing"      # plan
```

---

## 8. Trampas conocidas

| Trampa | Solución |
|--------|----------|
| Los refs `@eN` caducan tras cualquier cambio de página | Re-snapshot antes de cada interacción |
| Server islands cargan tarde (`/produccion`, `/recipes`) | `wait --load networkidle` + re-snapshot |
| Login con Google no automatizable | Usar email/contraseña |
| Sign-up manda email (Resend rechaza `example.com`) | Crear usuario con `seed:test-users` o verificar en BD |
| Suscripción cacheada 60s (Accelerate) | Esperar ~60s o `?nocache=<ts>` |
| `PATCH /api/recipes/:id` reemplaza ingredientes | Enviar la lista completa |
| Borrar ingrediente en uso → bloqueado | Usar `GET /api/ingredients/:id/usage` primero |
| El cliente Prisma `generated/client` no corre en Node | Usar `generated-node/client` en scripts |
| Dev server ya corriendo (`astro dev` activo) | Reutilizar; si hace falta, `astro dev --force` |
| Email stub imprime token en stdout de wrangler | Leer la terminal donde corre `pnpm dev` (no accesible desde el agente) |

---

## 9. Endpoints API de referencia

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/recipes` | Lista resúmenes (sin paginar) |
| POST | `/api/recipes` | Crear receta |
| GET | `/api/recipes/:id` | Detalle completo |
| PATCH | `/api/recipes/:id` | Actualizar (reemplaza ingredientes) |
| DELETE | `/api/recipes/:id` | Eliminar |
| POST | `/api/recipes/:id/duplicate` | Duplicar |
| POST/PATCH/DELETE | `/api/recipes/:id/fixed-costs[/:fid]` | Costos fijos de receta |
| POST/PATCH/DELETE | `/api/recipes/:id/presentations[/:pid]` | Presentaciones |
| POST/PATCH/DELETE | `/api/presentations/:pid/fixed-costs[/:fcid]` | Costos fijos de presentación |
| GET/POST | `/api/ingredients` | Listar / crear ingredientes |
| PATCH/DELETE | `/api/ingredients/:id` | Actualizar / eliminar (bloqueado si en uso) |
| GET | `/api/ingredients/:id/usage` | Recetas que usan el ingrediente |
| GET | `/api/auth/session` | Sesión + suscripción (features) |
| GET/PUT | `/api/preferences` | Preferencias de usuario |
| GET | `/api/billing/subscription` | Suscripción actual |
| GET | `/api/billing/plans` | Planes con features |
| POST | `/api/account/update-name` | Cambiar nombre (FormData) |
| POST | `/api/account/change-email` | Cambiar email (FormData) |
| POST | `/api/account/change-password` | Cambiar contraseña (FormData) |
| POST | `/api/stripe/checkout` | Checkout Session |
| POST | `/api/stripe/portal` | Customer Portal |
| POST | `/api/stripe/sync-session` | Sync tras checkout |

**Schemas**: todos los payloads de creación/actualización viven en
`packages/types/src/api/` (`recipes.ts`, `ingredients.ts`) — validados con Zod.
