# Secrets propagation: manual sync script, not CI-driven

> **Nota (Task 13b):** la decisión de fondo sigue vigente; el destino `pages` del script se retiró (hoy sólo `workers`, sobre `apps/api`). Ver ADR-0009.

Runtime secrets (DATABASE_URL, STRIPE_SECRET_KEY, GOOGLE_CLIENT_ID, etc.) are set in Cloudflare via a manual `scripts/sync-cloudflare-secrets.mjs` script — not by CI during deploy. The CI only holds `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to authenticate deploys.

## Considered Options

- **`wrangler secret put` in CI**: Requires storing runtime secrets in GitHub Secrets so CI can read them and push to Cloudflare. Rejected because it puts every runtime secret in GitHub, which contradicts the principle that Cloudflare is the canonical secrets store.
- **`.dev.vars` / `.env` generated in CI**: Wrangler reads `.dev.vars` at deploy time, so CI would generate it from GitHub Secrets. Same rejection reason: runtime secrets in GitHub.
- **Manual script (chosen)**: A developer runs `scripts/sync-cloudflare-secrets.mjs --env staging|production` when secrets are created or rotated. The script reads from `.env.cloudflare` (not committed) and `scripts/secrets-map.json` (committed). GitHub never sees runtime secret values.

## Consequences

- Secrets rotation requires manual execution of the sync script — no automation. Acceptable for a project of this size; if rotation frequency increases, a `workflow_dispatch`-triggered GitHub Action could wrap the same script.
- `.env.cloudflare` must be shared securely out-of-band (password manager, not Slack/email).
