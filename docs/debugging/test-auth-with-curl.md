# Debugging con curl: autenticación, seeding y verificación de páginas protegidas

Guía para probar páginas protegidas de KitchCalc vía `curl` sin levantar un navegador.

## Resumen del flujo

1. Crear usuario de prueba (sign-up vía API)
2. Extraer cookies de sesión de la respuesta
3. (Si es necesario) Crear suscripción y datos de prueba en la DB
4. Hacer requests autenticados con las cookies
5. Limpiar datos de prueba

---

## 1. Registrar usuario de prueba

Better Auth expone `/api/auth/sign-up/email`. El usuario se crea y las cookies de sesión se devuelven en `Set-Cookie`.

```bash
curl -sv -X POST http://localhost:4321/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@debug.com","password":"testpass123","name":"DebugUser"}'
```

**Cookies importantes en la respuesta:**
- `better-auth.session_token` — token de sesión (HttpOnly, SameSite Lax, 7 días)
- `better-auth.session_data` — payload firmado de la sesión (HttpOnly, 5 min)

Ambas deben enviarse juntas en cada request posterior.

**Extraer el `userId`** del JSON de respuesta (`data.user.id`). Se usará en inserts de DB.

---

## 2. Hacer requests autenticados

```bash
curl -s http://localhost:4321/produccion \
  -H "Cookie: better-auth.session_token=TOKEN; better-auth.session_data=DATA"
```

Si la página devuelve 302 → `/sign-in`, la sesión expiró o las cookies son inválidas.  
Si devuelve 200, la página se renderizó correctamente.

---

## 3. Dar features al usuario (crear plan + suscripción)

Un usuario recién creado tiene tier `free` sin `production_planner`. Para probar páginas con feature gates hay que insertar una suscripción.

### Tablas involucradas

| Tabla                  | Prisma model        | Notas                                        |
| ---------------------- | ------------------- | -------------------------------------------- |
| `subscription_plans`   | `SubscriptionPlan`  | Define tier, features (JSON), límites        |
| `subscriptions`        | `Subscription`      | Relaciona `user_id` con `plan_id`            |
| `user`                 | `User`              | Better Auth gestiona esta tabla              |

### Insertar plan de prueba

```sql
INSERT INTO subscription_plans (id, stripe_price_id, name, tier, billing_interval, price_cents, recipes_limit, ingredients_limit, features_json)
VALUES ('plan_basic_test', 'price_test_basic', 'Basic Test', 'basic', 'monthly', 500, 75, NULL, '{"production_planner":true,"pdf_export":true,"advanced_costs":true}')
ON CONFLICT (id) DO NOTHING;
```

### Insertar suscripción para el usuario

```sql
INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at)
VALUES ('sub_test_basic', 'EL_USER_ID', 'cus_test', 'sub_test_basic_123', 'plan_basic_test', 'active', NOW(), NOW() + INTERVAL '30 days', false, NOW())
ON CONFLICT (id) DO NOTHING;
```

**Nota sobre caché:** El middleware cachea `Astro.locals.subscription` por 60 segundos (`src/middleware.ts:43`). Si se modifica la suscripción en la DB, esperar 60s o reiniciar el dev server para que el cambio surta efecto.

### Ejecutar SQL con Prisma

```bash
cd /path/to/recetario
npx prisma db execute --file /tmp/mi_script.sql
```

---

## 4. Crear datos de prueba (recetas + ingredientes)

Si la página necesita datos para mostrar contenido (ej. el selector de recetas), insertar ingredientes + recetas.

### Tablas involucradas

| Tabla                   | Prisma model          | FK / Relaciones                  |
| ----------------------- | --------------------- | -------------------------------- |
| `ingredients`           | `Ingredient`          | `owner_id` → usuario             |
| `recipes`               | `Recipe`              | `owner_id` → usuario             |
| `recipe_ingredients`    | `RecipeIngredient`    | `recipe_id` → recipes, `ingredient_id` → ingredients |
| `recipe_presentations`  | `RecipePresentation`  | `recipe_id` → recipes            |

### Ejemplo de inserts

```sql
-- Ingredientes
INSERT INTO ingredients (owner_id, name, unit, price, purchase_quantity)
VALUES 
  ('EL_USER_ID', 'Harina', 'g', 45.00, 1000),
  ('EL_USER_ID', 'Azúcar', 'g', 35.00, 1000);

-- Receta
INSERT INTO recipes (owner_id, name, category, desired_margin, fixed_costs_percentage)
SELECT 'EL_USER_ID', 'Pan dulce', 'Panadería', 30, 10
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE owner_id = 'EL_USER_ID' AND name = 'Pan dulce');

-- Relación receta-ingrediente (usa los IDs reales)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
SELECT r.id, i.id, 500, 'g'
FROM recipes r, ingredients i
WHERE r.owner_id = 'EL_USER_ID' AND r.name = 'Pan dulce'
  AND i.owner_id = 'EL_USER_ID' AND i.name = 'Harina'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id AND ri.ingredient_id = i.id
  );

-- Presentación
INSERT INTO recipe_presentations (recipe_id, name, units_per_batch, sale_price)
SELECT r.id, 'Pieza', 12, 25.00
FROM recipes r
WHERE r.owner_id = 'EL_USER_ID' AND r.name = 'Pan dulce'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_presentations rp WHERE rp.recipe_id = r.id AND rp.name = 'Pieza'
  );
```

---

## 5. Verificar que la página renderiza lo esperado

### Buscar elementos clave en el HTML

```bash
curl -s http://localhost:4321/produccion \
  -H "Cookie: better-auth.session_token=TOKEN; better-auth.session_data=DATA" \
  | grep -o 'recipe-selector-form\|selected-count\|No hay recetas\|UpgradePrompt\|data-basic-limit'
```

**Qué esperar de cada match:**

| Match                  | Significado                                          |
| ---------------------- | ---------------------------------------------------- |
| `recipe-selector-form` | El formulario de selección de recetas está presente  |
| `selected-count`       | El contador de recetas está en el DOM                |
| `No hay recetas`       | No hay recetas para el usuario → crear datos de prueba |
| `UpgradePrompt`        | El usuario no tiene el feature flag → verificar suscripción |
| `data-basic-limit`     | Usuario es Basic (atributo presente en el `<form>`)  |

### Verificar datos JSON embedidos en la página

```bash
curl -s http://localhost:4321/produccion \
  -H "Cookie: ..." \
  | python3 -c "
import sys, re, json
html = sys.stdin.read()
m = re.search(r'<script type=\"application/json\" id=\"production-data\"[^>]*>(.*?)</script>', html, re.DOTALL)
if m:
    data = json.loads(m.group(1).strip())
    print(f'OK: {len(data)} recipes')
else:
    print('FAIL: production-data script not found or empty')
"
```

**Importante:** Si el contenido del script es literal `{JSON.stringify(...)}` en vez de `[{...}]`, significa que la expresión Astro no se evaluó. Esto pasa cuando se usa `{expression}` dentro de un `<script>` sin `is:inline`. Ver patrón correcto abajo.

---

## 6. Limpiar datos de prueba

```sql
DELETE FROM recipe_presentations WHERE recipe_id IN (SELECT id FROM recipes WHERE owner_id = 'EL_USER_ID');
DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE owner_id = 'EL_USER_ID');
DELETE FROM recipes WHERE owner_id = 'EL_USER_ID';
DELETE FROM ingredients WHERE owner_id = 'EL_USER_ID';
DELETE FROM subscriptions WHERE user_id = 'EL_USER_ID';
DELETE FROM session WHERE user_id = 'EL_USER_ID';
DELETE FROM account WHERE user_id = 'EL_USER_ID';
DELETE FROM "user" WHERE id = 'EL_USER_ID';
DELETE FROM subscription_plans WHERE id = 'plan_basic_test';
```

**Orden importa:** Borrar primero las tablas con FK (recipe_presentations, recipe_ingredients) antes que sus padres (recipes, ingredients, user).

---

## 7. Patrón correcto para pasar datos SSR a scripts del cliente

**Error común:**
```astro
<script type="application/json" id="my-data">
  {JSON.stringify(someData)}
</script>
```

En Astro, el contenido de `<script>` no se procesa como template. `{...}` se emite como texto literal.

**Forma correcta (usada en `recipes/index.astro:221`):**
```astro
---
const myDataJson = JSON.stringify(someData);
---

<script type="application/json" id="my-data" is:inline set:html={myDataJson}></script>
```

- `is:inline` evita que Astro procese/bundlee el script
- `set:html={...}` inyecta el string JSON como innerHTML del elemento (directiva de Astro)

---

## Notas

- **Columna `owner_id` vs `ownerId`:** El schema Prisma usa `ownerId @map("owner_id")`. En SQL crudo usar `owner_id` (snake_case de la DB). En TypeScript usar `ownerId`.
- **`"user"` con comillas:** La tabla `user` es palabra reservada en PostgreSQL. Siempre referenciarla como `"user"` en SQL.
- **Columnas de Better Auth:** Las tablas `session`, `account`, `verification` y `user` son gestionadas por Better Auth. La columna de FK a user es `user_id` en la DB.
- **Prevenir conflictos:** Usar `ON CONFLICT DO NOTHING` o `WHERE NOT EXISTS` para que los scripts de prueba sean idempotentes.
