# AGENTS.md — KitchCalc (Recetario)

## Project overview

Astro 6 SSR app deployed to **Vercel**. Package manager: **pnpm** (v9+). Node >= 22.12.0.

## Commands

| Command            | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | Dev server at `localhost:4321`               |
| `pnpm build`       | Production build                             |
| `pnpm format`      | Prettier formatting (astro + standard files) |
| `pnpm astro check` | Type-check `.astro` and `.ts` files          |
| `pnpm eslint .`    | Lint all JS/TS/Astro files                   |

No dedicated test infrastructure exists yet.

## Architecture

### Pages and routing

- `src/pages/` — file-based routing (Astro convention)
- `/` redirects to `/recipes` (`src/pages/index.astro:3`)
- Protected pages (`/recipes`, `/ingredients`, `/settings`) redirect unauthenticated users to `/sign-in`
- Authentication is Google OAuth only via **Better Auth**

### Auth flow

- `src/middleware.ts` populates `Astro.locals.user` and `Astro.locals.session` on every request
- `src/lib/auth.ts` initializes Better Auth with a singleton `auth` instance
- `src/pages/api/auth/[...all].ts` exports `ALL` route handler for `better-auth` callbacks
- Client: `src/lib/auth-client.ts` creates the client; `sign-in.ts` / `sign-out.ts` handle social sign-in with rate limiting and popup/open-in-tab logic

### Data layer (`src/lib/db/`)

- **Dual backend**: Postgres (production via `DATABASE_URL`) or SQLite (local dev fallback)
- Driver is a process-lifetime singleton (`globalThis.__recipesDriver`)
- `connection.ts` handles init, schema creation (`createTables`), seeding (`seedIfNeeded`), and schema version tracking (`RECIPE_DATA_SCHEMA_VERSION = 4`)
- All CRUD functions are scoped by `ownerId` for multi-tenancy
- `src/lib/recipe-data.ts` is a compat re-export of `./db/index` — always import through there
- Helpers in `helpers.ts` normalize all inputs (trim strings, clamp margins, validate numbers)

### Multi-tenant data isolation

- Every ingredient/recipe has an `owner_id` column
- Authenticated users get their own scope via `getRecipeDataOwner(user)` in `connection.ts:121`
- `RECIPES_STATIC_OWNER_EMAIL` / `RECIPES_STATIC_OWNER_ID` env vars map a user to the static seed dataset (`__static_seed__` scope)
- Users not matching those env vars get data isolated by their auth user ID

### Seed data

- JSON files in `data/ingredients.json` and `data/recipes.json`
- Auto-loaded on first run when the `__static_seed__` scope is empty
- SQLite files: `data/database.sqlite` (recipes), `data/auth.db` (auth — gitignored)

## Styling conventions

### Tailwind v4 + custom accent colors

- TailwindCSS 4 with `@tailwindcss/vite` plugin (no `tailwind.config.*`)
- `global.css` defines `--color-accent-50` through `--color-accent-700` mapped from CSS variables `--aw-accent-*`
- Layout.astro sets `--aw-accent-*` variables via the `style` attribute on `<html>` from `getAccentCssVars()`
- **Always use `accent-*` semantic classes** (e.g. `bg-accent-600`, `text-accent-50`, `border-accent-200`), never raw indigo/violet/etc
- Accent families: indigo, violet, blue, emerald, rose, amber

### Dark mode

- Toggled by `.dark` class on `<html>`, handled through **CSS variable tokens** (no manual `.dark` CSS overrides)
- Semantic color tokens auto-adapt between light and dark via `:root` / `.dark` CSS variable blocks in `global.css`
- Accent colors use `--aw-accent-*` CSS variables dynamically set on `<html>` via `getAccentCssVars()`
- `<html>` gets `data-theme="light|dark"` and `data-accent="indigo|..."` attributes for JS runtime
- Layout's client-side `<script>` block calls `applyTheme()` on page load and `astro:after-swap`

### Color system (semantic CSS variable tokens)

All grayscale and feedback colors use semantic tokens that auto-adapt to dark mode.
Tokens are defined in `@theme` in `global.css` as `var(--tw-*)` references.
The `:root` block sets light values, `.dark` block sets dark values.

| Token class                 | Light value | Dark value               | Replaces                    |
| --------------------------- | ----------- | ------------------------ | --------------------------- |
| **Surface**                 |             |                          |                             |
| `bg-background`             | `#f8fafc`   | `oklch(0.176 0.008 258)` | `bg-slate-50`               |
| `bg-card`                   | `#ffffff`   | `oklch(0.208 0.008 258)` | `bg-white`                  |
| `bg-muted`                  | `#f1f5f9`   | `oklch(0.208 0.008 258)` | `bg-slate-100`              |
| `bg-hover-muted`            | `#e2e8f0`   | `oklch(0.31 0.008 258)`  | `hover:bg-slate-50/100/200` |
| **Text**                    |             |                          |                             |
| `text-foreground`           | `#0f172a`   | `oklch(0.856 0.005 258)` | `text-slate-900/800`        |
| `text-secondary-foreground` | `#334155`   | `oklch(0.78 0.006 258)`  | `text-slate-700`            |
| `text-muted-foreground`     | `#64748b`   | `oklch(0.637 0.01 258)`  | `text-slate-600/500`        |
| `text-subtle-foreground`    | `#cbd5e1`   | `oklch(0.44 0.012 258)`  | `text-slate-400/300`        |
| **Border**                  |             |                          |                             |
| `border-border`             | `#e2e8f0`   | `oklch(0.31 0.008 258)`  | `border-slate-200`          |
| `border-border-light`       | `#f1f5f9`   | `#030712`                | `border-slate-100`          |
| **Feedback (danger)**       |             |                          |                             |
| `text-danger`               | `#be123c`   | `oklch(0.78 0.1 20)`     | `text-rose-7/6/500`         |
| `bg-danger-bg`              | `#fff1f2`   | `oklch(0.18 0.035 20)`   | `bg-rose-50`                |
| `bg-danger-solid`           | `#e11d48`   | `oklch(0.68 0.15 20)`    | `bg-rose-6/5/400`           |
| `border-danger-border`      | `#fecdd3`   | `oklch(0.30 0.06 20)`    | `border-rose-200`           |
| **Feedback (success)**      |             |                          |                             |
| `text-success`              | `#047857`   | `oklch(0.78 0.08 160)`   | `text-emerald-7/6/500`      |
| `bg-success-bg`             | `#ecfdf5`   | `oklch(0.18 0.03 160)`   | `bg-emerald-50`             |
| `bg-success-solid`          | `#10b981`   | `oklch(0.68 0.15 160)`   | `bg-emerald-500`            |
| `border-success-border`     | `#a7f3d0`   | `oklch(0.30 0.05 160)`   | `border-emerald-200`        |
| **Feedback (warning)**      |             |                          |                             |
| `text-warning`              | `#b45309`   | `oklch(0.82 0.08 85)`    | `text-amber-7/6/500`        |
| `bg-warning-bg`             | `#fffbeb`   | `oklch(0.18 0.03 85)`    | `bg-amber-50/100`           |
| `bg-warning-solid`          | `#f59e0b`   | `oklch(0.72 0.15 85)`    | `bg-amber-500`              |
| `border-warning-border`     | `#fde68a`   | `oklch(0.30 0.05 85)`    | `border-amber-200`          |

#### Color rules

- **ALWAYS use semantic tokens** (`bg-card`, `text-foreground`, `border-border`) instead of raw Tailwind colors (`bg-white`, `text-slate-900`, `border-slate-200`).
- **NEVER write `.dark` CSS selector overrides** — the token system handles dark mode automatically.
- **NEVER override Tailwind internal variables** (`--tw-shadow-color`, `--tw-gradient-from`, etc.).
- **NEVER use hardcoded hex/oklch values** in `<style>` blocks — use `var()` references to tokens.
- Exceptions: accent colors (`bg-accent-600`, `text-accent-50`, `border-accent-200`) auto-adapt via `--aw-accent-*`. Inline `dark:*` variants are valid for non-color properties (e.g. `dark:shadow-none`, `dark:shadow-[...]`).
- `color-scheme: light dark` is set on `:root` for form controls and scrollbars.

### Component patterns

- **Buttons**: `rounded-xl`, `text-sm font-bold`, `inline-flex items-center justify-center gap-2`, `min-h-11`, `transition-colors`
- **Primary CTA**: `bg-accent-600 px-6 py-3 text-white hover:bg-accent-700`
- **Secondary**: `border border-border bg-card px-5 py-3 text-muted-foreground hover:bg-background`
- **Danger solid**: `bg-danger-solid px-5 py-3 text-white hover:bg-danger-solid`
- **Cards/sections**: `rounded-2xl` or `rounded-3xl`, `bg-card border border-border shadow-sm`
- **Icons**: `astro-icon` with `lucide:*` names, imported as `<Icon name="lucide:chef-hat" size={20} />``

### View transitions

- Astro's built-in `ClientRouter` used via `<ClientRouter />` in Layout
- Custom `::view-transition-group(app-content)` animations with blur + translate
- Component transitions use `transition:animate="none"` on static chrome (header, sidebar, mobile nav)
- JS event listeners bound on `astro:page-load` and `astro:after-swap` with `data-*-bound="1"` guards to prevent duplicate binding

### JS binding convention

- DOM bound event listeners use `data-*-bound="1"` (or similar) to avoid re-binding across SPA navigations
- Examples: `data-sidebar-bound`, `data-backdrop-bound`, `data-sign-in-bound`

## Import conventions

- `import { Icon } from "astro-icon/components"` for icons
- `import { ... } from "../lib/recipe-data"` for all DB access (not directly from `./db/`)
- `import { auth } from "../lib/auth"` for server-side auth
- `import { authClient } from "../lib/auth-client"` for client-side auth

## Environment variables (.env)

| Variable                                                 | Purpose                                            |
| -------------------------------------------------------- | -------------------------------------------------- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`              | Google OAuth credentials                           |
| `BETTER_AUTH_SECRET`                                     | Session encryption secret                          |
| `BETTER_AUTH_URL`                                        | Public base URL (e.g. `http://localhost:4321`)     |
| `DATABASE_URL` / `POSTGRES_URL`                          | Postgres connection string (auto-detected)         |
| `RECIPES_STATIC_OWNER_ID` / `RECIPES_STATIC_OWNER_EMAIL` | Map a user to seed dataset                         |
| `RECIPES_DB_PATH` / `APP_DB_PATH`                        | Override SQLite path (default `./data/recipes.db`) |
| `POSTGRES_SSL_CA` / `POSTGRES_SSL_INSECURE`              | SSL config for Postgres                            |

## Key gotchas

- **No `.env.local`** support — use `.env`
- On Vercel, SQLite uses `/tmp` (ephemeral). Set `DATABASE_URL` for persistence.
- Schema migrations: `createTables` in `connection.ts` uses `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS`
- `run_migration.mjs` is a legacy one-off Postgres migration script — not part of the normal flow
- The `.prettierrc` uses `prettier-plugin-astro`
- `pnpm-workspace.yaml` only exists to allow native build of `esbuild` and `sharp`
