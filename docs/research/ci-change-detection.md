# CI Change Detection for Recetario Monorepo

**Issue**: #91 — Conditionally build/deploy only changed apps in CI.

## Dependency Graph

```
@recetario/web → auth, billing, config, types, ui
@recetario/api → auth, billing, config, types, db
@recetario/auth → config, (peer: db)
@recetario/billing → config, types, (peer: db)
@recetario/db → config, types
@recetario/types → config (dev)
@recetario/config → (leaf)
```

**Conclusion**: Nearly all packages are shared. The only unshared paths are:
- `packages/ui/**` → web only
- `packages/db/**` → api only
- `apps/web/**` → web only
- `apps/api/**` → api only

Root files (`pnpm-lock.yaml`, `turbo.json`, `pnpm-workspace.yaml`, `.github/workflows/**`) should trigger both.

## Options Evaluated

### 1. Turborepo `--dry-run` (RECOMMENDED)

**How it works**: Turbo already knows the full dependency graph. `turbo run build --filter=@recetario/web...[HEAD^1] --dry-run=json` outputs a JSON list of packages that would be built — empty if nothing in web's dependency tree changed.

**Pros**:
- Self-maintaining: no manual dependency graph in CI config
- Correct by construction: turbo's own hashing includes root config files (`turbo.json`, lockfile, root `package.json`), so root changes naturally trigger everything
- No extra action dependency

**Cons**:
- Requires `pnpm install` in the detect job (~30s overhead)
- Requires `fetch-depth: 2` for `HEAD^1` comparison

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Detect changed packages
        id: filter
        run: |
          web_changed=$(pnpm exec turbo run build \
            --filter='@recetario/web...[HEAD^1]' \
            --dry-run=json | jq -e '.packages | length > 0' && echo true || echo false)
          api_changed=$(pnpm exec turbo run build \
            --filter='@recetario/api...[HEAD^1]' \
            --dry-run=json | jq -e '.packages | length > 0' && echo true || echo false)
          echo "web=$web_changed" >> "$GITHUB_OUTPUT"
          echo "api=$api_changed" >> "$GITHUB_OUTPUT"

  build-web:
    needs: detect-changes
    if: needs.detect-changes.outputs.web == 'true'
    # ...

  build-api:
    needs: detect-changes
    if: needs.detect-changes.outputs.api == 'true'
    # ...
```

**Turbo filter syntax**: `@recetario/web...[HEAD^1]` means "packages that are `@recetario/web` OR any of its dependencies, AND that changed since `HEAD^1`". The `...` suffix on the package name means "include its dependencies".

### 2. dorny/paths-filter (ALTERNATIVE)

**How it works**: Pure git diff path matching. No dependency install needed.

**Pros**:
- Very fast (no install step)
- Widely used (2k+ stars)

**Cons**:
- Must manually maintain the dependency graph in CI config
- Root config changes must be listed explicitly
- Drifts from reality when packages are added/removed

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'apps/web/**'
              - 'packages/auth/**'
              - 'packages/billing/**'
              - 'packages/config/**'
              - 'packages/types/**'
              - 'packages/ui/**'
              - 'pnpm-lock.yaml'
              - 'turbo.json'
              - 'pnpm-workspace.yaml'
              - '.github/workflows/**'
            api:
              - 'apps/api/**'
              - 'packages/auth/**'
              - 'packages/billing/**'
              - 'packages/config/**'
              - 'packages/types/**'
              - 'packages/db/**'
              - 'pnpm-lock.yaml'
              - 'turbo.json'
              - 'pnpm-workspace.yaml'
              - '.github/workflows/**'
```

### 3. tj-actions/changed-files

Similar to paths-filter but outputs file lists. Overkill for boolean "changed or not" decisions. Use paths-filter instead.

### 4. Manual `git diff`

```bash
git diff --name-only HEAD^1 HEAD | grep -qE '^(apps/web|packages/(auth|billing|config|types|ui))'
```

Works but fragile. Use paths-filter if avoiding turbo overhead.

## Recommendation

**Use Turborepo `--dry-run`** (Option 1).

Rationale:
1. This project already uses turborepo — leverage its dependency graph rather than duplicating it
2. The ~30s pnpm install overhead in the detect job is negligible compared to build/deploy times
3. Zero maintenance: adding a package or changing dependencies automatically reflects in CI
4. Root config changes (lockfile, turbo.json, etc.) are handled automatically by turbo's hashing — no need to list them

The `dorny/paths-filter` approach is a solid fallback if the install overhead becomes unacceptable.
