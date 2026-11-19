# Guía de Contribución a KitchCalc

¡Gracias por tu interés en contribuir a KitchCalc! Este proyecto es de código abierto bajo la licencia **MIT**.

---

## 1. Requisitos del Entorno

- **Node.js**: `>= 22.23.1`
- **pnpm**: `11.1.2` (bloqueado por `packageManager`)
- **Docker** o una instancia de PostgreSQL accesible (Neon / local)

---

## 2. Configuración Local

1. Clona el repositorio:

   ```bash
   git clone https://github.com/tu-usuario/recetario.git
   cd recetario
   ```

2. Instala las dependencias:

   ```bash
   pnpm install
   ```

3. Prepara tus variables de entorno:

   ```bash
   cp .env.example .env
   ```

   Ajusta `DATABASE_URL` y las claves necesarias en `.env`.

4. Aplica las migraciones de base de datos y corre los datos semilla de ejemplo:

   ```bash
   pnpm exec prisma migrate dev
   pnpm exec tsx packages/db/prisma/seed.ts
   ```

5. Inicia el entorno de desarrollo:
   ```bash
   pnpm dev
   ```

   - Web: `http://localhost:4321`
   - API: `http://localhost:8787`

---

## 3. Reglas de Arquitectura

Para mantener la calidad y consistencia del monorepo:

- **Cliente delgado**: `apps/web` (Nuxt 4) **nunca** importa `@recetario/db` ni `prisma` directamente. Toda comunicación de datos ocurre a través de los endpoints de `apps/api` (Hono).
- **Persistencia pura**: `packages/db` solo expone métodos CRUD puros y siempre aplica el filtrado por `ownerId`.
- **Tokens y estilos**: Usa siempre tokens semánticos de Tailwind (`bg-card`, `text-foreground`, `border-border`, `accent-*`). Evita colores fijos o estilos inline.
- **Componentes**: Revisa las convenciones en [`DESIGN.md`](./DESIGN.md) y [`AGENTS.md`](./AGENTS.md).

---

## 4. Validación de Código

Antes de enviar un Pull Request, asegúrate de que todos los checks pasen localmente:

```bash
# Linter y formato
pnpm lint
pnpm format

# Chequeo de tipos
pnpm --filter @recetario/web type-check
pnpm type-check

# Pruebas automatizadas
pnpm test
```

---

## 5. Proceso de Pull Requests

1. Crea una rama descriptiva para tu cambio: `git checkout -b feat/mi-mejora` o `git checkout -b fix/mi-correccion`.
2. Realiza commits atómicos siguiendo la convención de [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(web): ...`
   - `fix(api): ...`
   - `docs: ...`
3. Abre un Pull Request describiendo el problema que resuelve, los cambios implementados y las capturas de pantalla si modificaste la interfaz de usuario.
