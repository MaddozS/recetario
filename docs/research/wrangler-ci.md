# Wrangler CI/CD Research — GitHub Actions Deployment

## Project Context

Two apps to deploy:

| App | Project Name | Source | Wrangler Config |
|-----|-------------|--------|-----------------|
| `apps/web` | `recetario-web` | `apps/web/wrangler.jsonc` | Pages (Astro SSR via `@astrojs/cloudflare`) |
| `apps/api` | `recetario-api` | `apps/api/wrangler.jsonc` | Worker (Hono standalone) |

Wrangler is installed locally as a devDependency of `apps/api` (`wrangler@^4.114.0`). Both apps define `deploy` scripts in their respective `package.json`.

---

## 1. Authentication

### API Token

Use a **Cloudflare API Token** (not Global API Key — unsupported by wrangler-action v3+).

- **Template**: "Edit Cloudflare Workers" — grants full Workers + Pages deploy permissions.
- **Scope**: Account-level, restricted to the specific account.
- **Format**: `cfut_` prefix — scannable by credential detection tools.

### Environment Variables

Two env vars needed in CI:

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_API_TOKEN` | Authenticates wrangler commands |
| `CLOUDFLARE_ACCOUNT_ID` | Identifies the Cloudflare account (can also be set in `wrangler.jsonc` `account_id` field) |

Store both as **GitHub Actions secrets**. Never commit secrets to the repo.

### In GitHub Actions

Either:

**Option A — `cloudflare/wrangler-action@v3`** (official action):
```yaml
- uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Option B — run wrangler directly** (with env vars set):
```yaml
- run: pnpm --filter @recetario/web deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Both work. Option A provides extra features like `command-output`, `deployment-url` outputs, and secret management. Option B is simpler and uses existing `package.json` scripts.

---

## 2. Pages Deploy — `apps/web`

### Existing Setup

**`apps/web/package.json`** already has:
```json
"deploy": "wrangler pages deploy ./dist"
```

**`apps/web/wrangler.jsonc`** has:
- `name: "recetario-web"`
- KV namespace `SESSION`, service binding to `recetario-api`
- Missing: `pages_build_output_dir` — **required** for Pages deployments using wrangler config as source of truth. Without it, wrangler warns the file is "local development only."

### Command for CI

```bash
pnpm --filter @recetario/web wrangler pages deploy ./dist \
  --project-name=recetario-web \
  --branch="${{ github.ref_name }}" \
  --commit-hash="${{ github.sha }}" \
  --commit-dirty
```

**Flag breakdown:**

| Flag | Required? | Purpose |
|------|-----------|---------|
| `./dist` | Yes (positional) | Astro SSR build output directory |
| `--project-name` | No (inferred from wrangler.jsonc) | Explicit project name |
| `--branch` | No (auto-detected in git repos) | Production branch → production deploy; other → preview deploy |
| `--commit-hash` | No | Attaches SHA to deployment for traceability |
| `--commit-message` | No | Attaches commit message |
| `--commit-dirty` | No | Marks workspace as dirty; useful in CI where build artifacts differ from git HEAD |
| `--skip-caching` | No | Skips asset caching for faster builds |

**Minimal CI command:**
```bash
pnpm --filter @recetario/web wrangler pages deploy ./dist --commit-dirty
```

### Environments (production vs preview)

Pages has **only two environments**: `production` and `preview`.

- Deploying with `--branch=main` (or whatever is set as production branch) → **production** environment.
- Deploying with any other branch → **preview** environment.

Environment-specific overrides in `wrangler.jsonc`:
```jsonc
{
  "vars": { "API_URL": "https://api.recetario.app" },
  "env": {
    "production": {
      "vars": { "API_URL": "https://api.recetario.app" }
    },
    "preview": {
      "vars": { "API_URL": "https://staging-api.recetario.app" }
    }
  }
}
```

**Non-inheritable keys rule**: If any non-inheritable key (bindings, vars, kv_namespaces, services) is overridden in an environment, ALL non-inheritable keys must be specified in that environment block.

### Missing Config Fix

`apps/web/wrangler.jsonc` needs `pages_build_output_dir` to be used as source of truth:
```jsonc
{
  "pages_build_output_dir": "./dist"
}
```

Without it, the file only applies to local development and dashboard config takes precedence.

---

## 3. Workers Deploy — `apps/api`

### Existing Setup

**`apps/api/package.json`** already has:
```json
"deploy": "wrangler deploy"
```

**`apps/api/wrangler.jsonc`** has:
- `name: "recetario-api"`
- `main: "src/index.ts"`
- `compatibility_date: "2026-07-08"`
- `nodejs_compat` flag

### Command for CI

```bash
pnpm --filter @recetario/api wrangler deploy
```

Or with explicit environment:
```bash
pnpm --filter @recetario/api wrangler deploy --env=production
```

### Workers Environments

Unlike Pages (only `production`/`preview`), Workers support **arbitrary named environments**:

```jsonc
{
  "name": "recetario-api",
  "main": "src/index.ts",
  "vars": { "NODE_ENV": "development" },
  "env": {
    "staging": {
      "name": "recetario-api-staging",
      "vars": { "NODE_ENV": "staging" }
    },
    "production": {
      "name": "recetario-api-production",
      "vars": { "NODE_ENV": "production" }
    }
  }
}
```

Deploy to a specific environment:
```bash
wrangler deploy --env=staging
wrangler deploy --env=production
```

**Non-inheritable keys rule** same as Pages: override one binding → override all.

### Secrets

Currently documented secrets in `apps/api/wrangler.jsonc`:
- `INTERNAL_API_HOST` — set via `wrangler secret put` or dashboard

In CI, secrets must be pre-set in Cloudflare (one-time) via:
```bash
wrangler secret put INTERNAL_API_HOST --env=production
```

Or pass via `--secrets-file` flag:
```bash
wrangler deploy --secrets-file=./secrets.json
```

---

## 4. Non-Interactive / CI Mode

**No special "CI mode" flag needed.** When `CLOUDFLARE_API_TOKEN` (and optionally `CLOUDFLARE_ACCOUNT_ID`) are set as environment variables, wrangler skips interactive login and uses the token.

Other relevant flags:
- `--yes` / `-y` — skip confirmation prompts (only needed for project creation/deletion, not deploy)
- `--dry-run` — compile without deploying; useful for pre-deploy validation
- `--commit-dirty` (pages only) — marks workspace as dirty for CI deployments

---

## 5. Recommended GitHub Actions Workflow

### Option A: Direct wrangler (using existing package.json scripts)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @recetario/web cloudflare-build
      - run: pnpm --filter @recetario/web deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @recetario/api deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Option B: wrangler-action (official action)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @recetario/web cloudflare-build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/web
          command: pages deploy ./dist --commit-dirty

  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: deploy
```

### DB requirement

The web app's `cloudflare-build` script runs `prisma generate` + `prisma migrate deploy` + `astro build`. This needs `DATABASE_URL` at build time. Set it as a GitHub Actions secret:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Summary

| Concern | Solution |
|---------|----------|
| Auth | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` env vars (or `cloudflare/wrangler-action@v3`) |
| Web deploy | `wrangler pages deploy ./dist --commit-dirty` from `apps/web/` |
| API deploy | `wrangler deploy` (or `--env=production`) from `apps/api/` |
| Pages environments | `--branch` determines production vs preview; `env.production`/`env.preview` for overrides |
| Workers environments | `--env=<name>` flag; `env.<name>` config blocks |
| CI mode | No special flag — token-based auth is automatically non-interactive |
| Missing config | `apps/web/wrangler.jsonc` needs `pages_build_output_dir: "./dist"` |
| Secrets | Pre-set via `wrangler [pages] secret put`; `DATABASE_URL` needed at web build time |
