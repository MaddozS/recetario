# `@recetario/api`

Hono API deployed as a Cloudflare Worker.

## Commands

- `pnpm --filter @recetario/api exec wrangler dev`
- `pnpm --filter @recetario/api exec wrangler deploy`
- `pnpm exec turbo run type-check --filter=@recetario/api`

## Routes

- `GET /health` returns service status.
- `POST /api/auth/forgot-password`
- `GET /api/auth/reset-password`
- `POST /api/auth/reset-password`
- `ALL /api/auth/*`
- `POST /api/account/update-name`
- `POST /api/account/change-email`
- `POST /api/account/change-password`
- `POST /api/stripe/checkout`
- `POST /api/stripe/portal`
- `POST /api/stripe/webhook`

## Environment

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`

See `docs/cloudflare-deployment.md` for production deployment steps.
