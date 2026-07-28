# GitHub Actions: 3 workflows (ci, deploy-web, deploy-api)

The monorepo uses three GitHub Actions workflows: `ci.yml` (PR checks), `deploy-web.yml` (Cloudflare Pages), `deploy-api.yml` (Cloudflare Worker). CI and CD are separate because they have different triggers (PR vs push to `dev`/`master`) and different concerns (validation vs deployment). Web and API have separate CD workflows because they use different Cloudflare products with different deploy commands and can be deployed independently — Turborepo detects which app actually changed and skips the other.

## Considered Options

- **Single `deploy.yml`** with conditional jobs by branch (`if: github.ref`). Rejected because the two apps have different deploy commands, independent deployment cadences, and separate Cloudflare products — conditional jobs would make the file harder to read and debug.
- **Reusable workflow + callers.** Rejected for N=2 — the indirection doesn't justify itself. If the monorepo grows past 4 deployable apps, extract a reusable workflow then.
- **Combined CI+CD per app** (`web.yml`, `api.yml`). Rejected because CI and CD have different triggers — CI blocks PRs, CD deploys on push to protected branches. Combining them forces `workflow_dispatch` or conditional skips that are fragile.
- **Cloudflare Pages Git integration** for web. Rejected in favor of `wrangler pages deploy` from CI because it keeps build and deploy logs in GitHub Actions alongside the rest of CI/CD.
- **Vercel Remote Cache** for Turborepo. Rejected in favor of `actions/cache` on `.turbo/cache` — sufficient for a monorepo of this size and doesn't require a Vercel account.

## Secrets

- **Runtime secrets** (DATABASE_URL, STRIPE_SECRET_KEY, GOOGLE_CLIENT_ID, etc.) live in Cloudflare via `wrangler secret put`, not in GitHub. Cloudflare owns the runtime configuration.
- **CI secrets** (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) live in GitHub Environments (`staging`, `production`). GitHub only has the minimum needed to authenticate the deploy.
