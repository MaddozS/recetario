## Problem Statement

El monorepo tiene 17 runtime secrets que deben estar configurados en Cloudflare Workers y Cloudflare Pages para staging y producción. Hoy no hay un mecanismo automatizado para setearlos — cada secret se configura manualmente con wrangler, lo cual es propenso a errores (olvidar un destino, typo en el nombre, inconsistencia entre entornos). Además, cuando un secret rota no hay forma de actualizarlo en todos los destinos de manera confiable sin repetir comandos manuales.

## Solution

Un script manual `scripts/sync-cloudflare-secrets.mjs` que lee un mapeo declarativo commiteado (`scripts/secrets-map.json`) y un archivo de valores no commiteado (`.env.cloudflare` con secciones `[staging]` / `[production]`), y ejecuta `wrangler secret put` / `wrangler pages secret put` para cada runtime secret × entorno × destino. Soporta `--dry-run` para verificar sin ejecutar, `--env staging|production` para seleccionar entorno, y `--only=X,Y` para rotación dirigida.

## User Stories

1. Como developer que hace el setup inicial del proyecto, quiero ejecutar un solo comando para setear todos los runtime secrets en Cloudflare Workers y Pages para staging, sin tener que recordar qué variables van a qué producto.
2. Como developer que hace el setup inicial, quiero ejecutar el mismo comando con `--env production` para setear los secrets de producción, y que el script me pida confirmación antes de tocar producción.
3. Como owner que rota un secret (ej. nuevo DATABASE_URL), quiero ejecutar `--only=DATABASE_URL` para actualizar solo esa variable en todos los destinos y entornos, sin tocar las demás.
4. Como developer que quiere verificar qué comandos se ejecutarán, quiero usar `--dry-run` para ver la lista de comandos sin ejecutarlos, y confirmar que el mapeo y los valores son correctos antes de hacer cambios reales.
5. Como developer que agrega un nuevo runtime secret al proyecto, quiero editar `secrets-map.json` (commiteado) para declarar a qué productos va, y agregar sus valores en `.env.cloudflare` (no commiteado), y que el script lo detecte automáticamente.
6. Como reviewer de un PR que agrega un nuevo secret, quiero ver en el diff de `secrets-map.json` exactamente qué secrets nuevos se agregaron y a qué destinos van, sin ver los valores.
7. Como developer que corre el script por primera vez, quiero que verifique que wrangler está instalado y autenticado, y si no, que me diga exactamente qué comandos correr para solucionarlo.
8. Como developer que cometió un error en `.env.cloudflare` (falta una variable, valor vacío), quiero que el script falle explícitamente con un mensaje claro indicando qué variable falta y en qué sección, antes de ejecutar cualquier comando.
9. Como developer en entorno local, quiero que el script de Cloudflare secrets no interfiera con `sync-cloudflare-dev-vars.mjs` que ya maneja `.dev.vars` para desarrollo local.
10. Como owner del proyecto, quiero que los valores de runtime secrets nunca se commiteen al repo, y que `.env.cloudflare` esté en `.gitignore`.

## Implementation Decisions

### Script: `scripts/sync-cloudflare-secrets.mjs`

Script Node.js (ESM, `.mjs`) sin dependencias externas. Lee `secrets-map.json` y `.env.cloudflare`, construye la lista de comandos a ejecutar, y los ejecuta secuencialmente vía `child_process.execSync` o `spawn`.

Flags soportados:
- `--env staging|production` (requerido)
- `--only=X,Y,Z` (opcional, sin flag = full sync)
- `--dry-run` (opcional, imprime sin ejecutar)
- `--yes` (opcional, skippea confirm prompt en production)

Si `--env production` y no `--dry-run` y no `--yes`, requiere que el usuario escriba "production" para confirmar.

Pre-check: ejecuta `wrangler whoami` al inicio. Si falla, imprime instrucciones y sale con error.

### Secrets map: `scripts/secrets-map.json`

Archivo JSON commiteado con estructura:

```json
{
  "environments": {
    "staging": { "workers": "development", "pages": "dev" },
    "production": { "workers": "production", "pages": "master" }
  },
  "secrets": {
    "DATABASE_URL": { "targets": ["workers", "pages"] },
    "BETTER_AUTH_SECRET": { "targets": ["workers", "pages"] },
    "GOOGLE_CLIENT_ID": { "targets": ["workers", "pages"] },
    "GOOGLE_CLIENT_SECRET": { "targets": ["workers", "pages"] },
    "STRIPE_SECRET_KEY": { "targets": ["workers", "pages"] },
    "STRIPE_WEBHOOK_SECRET": { "targets": ["workers", "pages"] },
    "RECIPES_STATIC_OWNER_ID": { "targets": ["workers", "pages"] },
    "RECIPES_STATIC_OWNER_EMAIL": { "targets": ["workers", "pages"] },
    "STRIPE_PRICE_ID_BASIC_MONTHLY": { "targets": ["pages"] },
    "STRIPE_PRICE_ID_BASIC_YEARLY": { "targets": ["pages"] },
    "STRIPE_PRICE_ID_PRO_MONTHLY": { "targets": ["pages"] },
    "STRIPE_PRICE_ID_PRO_YEARLY": { "targets": ["pages"] },
    "BETTER_AUTH_URL": { "targets": ["workers"] },
    "WEB_ORIGIN": { "targets": ["workers"] },
    "RESEND_API_KEY": { "targets": ["workers"] },
    "SENDER_EMAIL": { "targets": ["workers"] }
  }
}
```

Los nombres de secrets en el mapeo deben coincidir exactamente con las keys de `.env.cloudflare`. Si una key del mapeo no está en `.env.cloudflare`, el script falla.

### Values: `.env.cloudflare`

Archivo no commiteado (`.gitignore`) con formato INI-style:

```ini
[staging]
DATABASE_URL=postgres://staging-db...
BETTER_AUTH_SECRET=...
...

[production]
DATABASE_URL=postgres://prod-db...
BETTER_AUTH_SECRET=...
...
```

El script parsea la sección que corresponde al `--env` indicado y valida que toda key del mapeo tenga un valor no vacío en esa sección.

### Mecanismo de ejecución

Para cada secret en el mapeo que tenga `targets` incluyendo `workers`, ejecuta:
```
wrangler secret put <KEY> --env <workers-env-name>
```
con el valor leído de `.env.cloudflare`.

Para cada secret con `targets` incluyendo `pages`, ejecuta:
```
wrangler pages secret put <KEY> --branch <pages-branch-name> --project-name recetario
```

Usa `child_process.execSync` con `stdio: "inherit"` para que el output de wrangler sea visible. Si un comando falla (exit code ≠ 0), el script falla inmediatamente.

### Reemplazo de `setup-cloudflare-secrets.mjs`

El script existente `scripts/setup-cloudflare-secrets.mjs` escribe JSON a `/tmp/` como workaround manual. El nuevo script lo vuelve obsoleto. Se elimina `scripts/setup-cloudflare-secrets.mjs` en este change.

### Separación de `.env` (desarrollo local)

`.env` y `sync-cloudflare-dev-vars.mjs` siguen manejando desarrollo local (`.dev.vars`). No se modifican. `.env.cloudflare` es independiente y solo se usa para staging/production.

## Testing Decisions

### Seam: `--dry-run`

El script soporta `--dry-run` que imprime los comandos que ejecutaría sin ejecutarlos. Este es el seam de testing: corre el script con un `.env.cloudflare` de prueba y `--dry-run`, verifica que el output contenga los comandos esperados para cada variable × entorno × destino.

### Qué hace un buen test

Verificar comportamiento externo:
- Que `--dry-run` produce los comandos correctos de wrangler con los flags correctos
- Que `--only=X` filtra solo la variable indicada
- Que `--env staging` usa las traducciones del mapeo (`workers: development`, `pages: dev`)
- Que `--env production` usa las traducciones de producción
- Que una variable en el mapeo pero ausente de `.env.cloudflare` produce un error claro
- Que `wrangler whoami` fallando produce un mensaje de instrucciones y exit code ≠ 0

### Sin framework de testing

El proyecto no tiene infraestructura de testing establecida. `--dry-run` como seam única permite verificación manual y scripting de smoke tests sin agregar dependencias.

## Out of Scope

- **Workflow de CI que setee secrets**: Los secrets no se setean desde CI. El script es manual.
- **Rotación automática**: No hay cron job ni trigger automático para rotar secrets.
- **Soporte para otros products de Cloudflare**: Solo Workers y Pages. D1, R2, KV fuera de scope.
- **Validación de conectividad**: El script no verifica que el valor del secret sea válido (ej. que DATABASE_URL acepte conexiones). Solo verifica que no esté vacío.
- **Migración de secrets existentes**: Si ya hay secrets seteados manualmente en Cloudflare, `wrangler secret put` hace upsert — no hay migración necesaria.
- **`.env.cloudflare` encryption**: El archivo es plaintext. Encriptación (git-crypt, SOPS) es responsabilidad del developer.

## Further Notes

- Ver [ADR-0004](docs/adr/0004-secrets-propagation-strategy.md) para el rationale completo de por qué script manual y no CI-driven.
- Ver [CONTEXT.md](CONTEXT.md#cicd) para los términos del dominio: Runtime secret, CI secret, Secrets sync script, Secrets map.
- Este spec depende de que los environments de Workers/Pages estén creados (issue #94) pero no está bloqueado por #94 — el script solo ejecuta comandos wrangler, no crea infraestructura.
