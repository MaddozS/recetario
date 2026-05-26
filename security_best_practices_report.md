# Security Audit Report — KitchCalc (Recetario)

**Date:** 2026-05-24
**Scope:** Full codebase audit — Astro 6 SSR, Better Auth, Prisma/PostgreSQL, Stripe billing
**Severity scale:** Critical > High > Medium > Low

---

## Executive Summary

**1 Critical, 3 High, 4 Medium, 3 Low** findings. The most urgent issue is the complete absence of CSRF protection on all cookie-authenticated state-changing endpoints. An attacker who tricks a logged-in user into visiting a malicious page could silently delete recipes, modify ingredients, or alter settings. Second priority is an open redirect in the Stripe checkout flow that could be used in phishing campaigns.

On the positive side, the authorization model (ownerId scoping on every DB query) is well-implemented, XSS protections via `sanitize-html` are solid, there is no usage of `eval`, raw SQL, or command execution, and the Stripe webhook signature verification is correct.

---

## CRITICAL

### [C-01] CSRF Protection Completely Missing on All State-Changing Endpoints

**Rule IDs:** NEXT-CSRF-001, EXPRESS-CSRF-001, REACT-CSRF-001
**Severity:** Critical
**Impact:** An attacker can trick an authenticated user into performing destructive actions (delete recipes, modify ingredients, change settings, trigger billing sessions) simply by visiting a malicious website that auto-submits a form targeting the app's origin.

**Evidence — all state-changing forms use cookie-based session auth with zero CSRF defenses:**

| Endpoint | Actions | File |
|---|---|---|
| `/recipes/[recipe]` POST | `update_recipe`, `delete_recipe`, `duplicate_recipe`, `create_presentation`, `update_presentation`, `delete_presentation` | `src/pages/recipes/[recipe].astro:117-309` |
| `/recipes` POST | `create_recipe`, `duplicate_recipe` | `src/pages/recipes/index.astro:32-73` |
| `/ingredients` POST | `create`, `update`, `delete` ingredient | `src/pages/ingredients.astro:100-220` |
| `/settings` POST | theme/accent preferences | `src/pages/settings.astro:58-84` |
| `/api/stripe/checkout` POST | creates Stripe Checkout Session (financial) | `src/pages/api/stripe/checkout.ts:5-77` |
| `/api/stripe/portal` POST | creates Stripe Customer Portal session (financial) | `src/pages/api/stripe/portal.ts:5-29` |

All these endpoints authenticate via Better Auth session cookies (checked via `Astro.locals.user` / `Astro.locals.session`) and contain **no CSRF tokens, no `Origin`/`Referer` validation, no custom header requirement, and no explicit SameSite cookie enforcement**. The Stripe checkout/portal endpoints are especially dangerous since they trigger billing actions.

**Fix:**
1. Generate a CSRF token server-side on each request
2. Embed it as a hidden `<input>` in all forms
3. Validate the token server-side before processing any POST
4. For API endpoints (`/api/stripe/*`), require a custom header (`X-Requested-With: XMLHttpRequest`) since browsers block cross-origin custom headers without CORS

**Mitigation:** Set session cookies to `SameSite=Strict` or `SameSite=Lax` via Better Auth config as defense-in-depth.

---

## HIGH

### [H-01] Open Redirect in Stripe Checkout Endpoint

**Rule IDs:** NEXT-REDIRECT-001, EXPRESS-REDIRECT-001
**Severity:** High
**Location:** `src/pages/api/stripe/checkout.ts:63-66`

**Evidence:**
```ts
success_url:
  successUrl || `${new URL(request.url).origin}/settings/billing?success=1`,
cancel_url:
  cancelUrl || `${new URL(request.url).origin}/pricing?canceled=1`,
```
`successUrl` and `cancelUrl` come from the untrusted client POST body (`body` on line 23) with **zero validation**. An attacker can submit `successUrl: "https://evil.com/phishing"` and after the Stripe payment flow completes, the user is silently redirected to an attacker-controlled domain. While Stripe does enforce HTTPS for the URL scheme (blocking `javascript:`), it accepts arbitrary `https://` domains for any third party, enabling phishing attacks.

This endpoint requires authentication (`Astro.locals.user`), but any authenticated user can be phished by a crafted link.

**Fix:** Validate `successUrl` and `cancelUrl` against a same-origin allowlist:

```ts
function safeUrl(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  try {
    const url = new URL(input);
    if (url.origin === new URL(request.url).origin) return input;
    // Relative paths (start with /)
    if (input.startsWith("/") && !input.startsWith("//")) return input;
  } catch { /* relative path without protocol */ }
  return fallback;
}
```

---

### [H-02] No Rate Limiting on Authentication Endpoints

**Rule IDs:** NEXT-DOS-001, EXPRESS-AUTH-001
**Severity:** High
**Location:** `src/lib/sign-in.ts:10-16`, `src/lib/sign-in.ts:18-24`, `src/pages/api/auth/[...all].ts:4-6`

**Evidence:** The email/password sign-in and sign-up functions have **no rate limiting** — no delay between attempts, no CAPTCHA, no IP-based throttling, no failed-attempt tracking. The Google OAuth flow similarly lacks server-side rate limiting. An attacker can brute-force credentials or perform credential stuffing with no obstacles.

The Better Auth catch-all handler (`src/pages/api/auth/[...all].ts:4-6`) delegates to `auth.handler(request)` without any rate-limiting middleware wrapper.

**Fix:** Implement rate limiting using one of:
1. Vercel Edge / WAF rate limiting on `/api/auth/*` path
2. In-app middleware using `rate-limiter-flexible` or similar
3. Exponential backoff after N failed attempts per username + IP combination

---

### [H-03] Auto-Incrementing Integer IDs Expose Resource Counts and Enable Enumeration

**Rule ID:** General Security Advice — Incrementing IDs
**Severity:** High
**Location:** All Prisma models — `prisma/schema.prisma`

**Evidence:** All database models use Prisma's default `@id @default(autoincrement())` integer primary keys. Recipe IDs (`/recipes/1`, `/recipes/2`, etc.) and ingredient IDs are sequential integers exposed in URLs. This reveals the global count of recipes and ingredients — an attacker can create a recipe and see its ID to infer how many total recipes exist across all users.

While `ownerId` scoping on every query prevents cross-user data access (returning 404 or null for other users' resources), the sequential IDs still constitute an information leak and enable resource enumeration attempts against the API.

**Fix:** Consider migrating to UUIDs (`@default(uuid())`) for public-facing resource IDs. If keeping integers, at minimum consider using non-sequential encoding (hashids) for URLs.

---

## MEDIUM

### [M-01] No Security Headers Configured

**Rule IDs:** NEXT-HEADERS-001, EXPRESS-HEADERS-001, REACT-HEADERS-001, JS-CSP-001
**Severity:** Medium
**Location:** Not found in application code; may exist at Vercel edge level

**Evidence:** No Content Security Policy (`Content-Security-Policy`), no `X-Content-Type-Options: nosniff`, no `X-Frame-Options` or `frame-ancestors`, no `Referrer-Policy`, no `Permissions-Policy` are set anywhere in the application code. The `astro.config.mjs` and `src/middleware.ts` do not set any security headers.

For an app that renders user-provided HTML (recipe instructions via `sanitize-html`), a CSP is particularly important as defense-in-depth against XSS. If the sanitizer has a bypass vulnerability, CSP would prevent script execution.

**Fix:** Add security headers via Astro middleware:
- `Content-Security-Policy: script-src 'self'` (minimal baseline)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

### [M-02] No Schema-Based Input Validation (TypeScript Types Are Not Runtime Validation)

**Rule IDs:** NEXT-INPUT-001, EXPRESS-INPUT-001
**Severity:** Medium
**Location:** All form handling: `src/pages/recipes/[recipe].astro`, `src/pages/ingredients.astro`, `src/pages/api/stripe/*.ts`

**Evidence:** Input validation relies entirely on manual type-checking (`typeof`, `Number.isFinite`, `String()`) scattered across multiple files with no centralized schema. Examples:

- `src/pages/recipes/[recipe].astro:272-291` — Manual array parsing of form fields
- `src/pages/api/stripe/checkout.ts:14-30` — Manual existence checks for `priceId`, `successUrl`, `cancelUrl`
- `src/pages/ingredients.astro:66-97` — Manual `readIngredientFormInput()` + `validateIngredientInput()`

The manual approach works for the current scope but is fragile — a missed boundary check could allow malformed data to reach the database layer. The DB layer (`src/lib/db/helpers.ts`) provides normalization via `normalizeOptionalText`, `toNumber`, etc., but there is no structured schema validation at the API boundary.

**Fix:** Add zod schemas for all form and API inputs. This provides:
1. Runtime type validation (TypeScript types are stripped at compile time)
2. Consistent, descriptive error messages
3. Prevention of edge cases (e.g., strings where numbers expected)

---

### [M-03] In-Memory Cache Without Size Limits

**Rule ID:** General
**Severity:** Medium
**Location:** `src/lib/cache.ts:1`

**Evidence:** The cache uses an unbounded `Map<string, { value, expiresAt }>` with no maximum size. While keys are user-scoped and TTL is short (60 seconds for data, shorter for subscriptions), there is no eviction policy beyond TTL expiration. In Vercel's serverless environment, each function instance has limited memory. Under heavy traffic, the cache could grow unexpectedly large if many users make requests within the same instance lifetime.

**Fix:** Add a `maxSize` parameter with LRU eviction (e.g., limit to 1000 entries). Consider using a distributed cache (Vercel KV) if running multiple concurrent instances.

---

### [M-04] External Service Error Details Logged Verbatim

**Rule IDs:** NEXT-LOG-001, EXPRESS-ERROR-001
**Severity:** Medium (Low in practice)
**Location:** `src/pages/api/stripe/webhook.ts:38-41`

**Evidence:**
```ts
console.error(
  "Webhook signature verification failed:",
  (err as Error).message,
);
```
While Stripe's signature verification errors are typically non-sensitive ("No signatures found matching..."), logging error messages from external services is a risky pattern. If Stripe ever changes their error format to include more data, or if this pattern is copied to other services, it could leak information.

**Fix:** Log generic messages and keep full errors for debugging only:

```ts
console.error("Webhook signature verification failed");
// For debugging: console.error((err as Error).message);
```

---

## LOW

### [L-01] localStorage Used for Non-Sensitive Preferences Only — Safe ✓

**Rule IDs:** JS-STORAGE-001, REACT-AUTH-001
**Severity:** Low (verified safe)
**Location:** `src/pages/recipes/[recipe].astro:993`, `src/layouts/LandingLayout.astro:51`, `src/components/RecipesSidebar.astro:256`

**Evidence:** `localStorage` is used exclusively for non-sensitive UI preferences:
- `recetario.showComments` — comment visibility toggle (`src/pages/recipes/[recipe].astro:993`)
- `kitchcalc_landing_theme` — landing page theme preference (`src/layouts/LandingLayout.astro:51`)
- Sidebar collapsed state (`src/components/RecipesSidebar.astro:256`)

No auth tokens, session identifiers, or secrets are stored in localStorage. No action needed.

---

### [L-02] Client-Side innerHTML Usage — All Properly Escaped or Static ✓

**Rule IDs:** JS-XSS-001, REACT-XSS-001, REACT-DOM-001
**Severity:** Low (verified safe)
**Location:** 30 usages across 10 files

**Evidence:** All 30 `innerHTML` usages across the codebase were individually audited:

- **User content rendering:** Uses `escHtml()`/`escapeHtml()`/`sanitizeHtml()` before insertion:
  - `src/pages/produccion.astro:199` — `escHtml()` used for all user data in production table HTML
  - `src/pages/recipes/index.astro:413,421` — `escHtml()` used for recipe name/category in dynamically created cards
  - `src/components/InstructionsEditor.astro:220,235,237` — `sanitizeHtml()` applied before reading/writing contenteditable

- **Static UI:** Hardcoded SVG/HTML strings with no user data:
  - `src/pages/sign-in.astro:222,256` — Loading overlay HTML
  - `src/pages/sign-up.astro:307,341` — Loading overlay HTML
  - `src/components/BillingSection.astro:248` — "Cargando..." spinner
  - `src/components/RecipeInstructions.astro:490-500` — Timer button SVG icons

No XSS risk identified in current usage. ✓

---

### [L-03] No Automated Dependency Auditing in CI

**Rule IDs:** REACT-SUPPLY-001, EXPRESS-DEPS-001
**Severity:** Low
**Location:** `package.json` (scripts section)

**Evidence:** The project lacks automated dependency vulnerability scanning. The `package.json` scripts do not include `pnpm audit` or similar. The `postinstall` script only runs `prisma generate`.

**Current key dependency versions (as of audit):**
- `astro: 6.3.3`
- `better-auth: 1.6.11`
- `prisma: 7.8.0`
- `stripe: 22.1.1`

**Fix:** Add `pnpm audit` to CI pipeline and configure Dependabot or Renovate for automated updates.

---

## Summary Table

| ID | Severity | Category | Finding |
|---|---|---|---|
| C-01 | Critical | CSRF | No CSRF protection on any cookie-authenticated state-changing endpoint — 6 endpoints affected |
| H-01 | High | Open Redirect | Arbitrary `successUrl`/`cancelUrl` accepted in Stripe checkout — `checkout.ts:63-66` |
| H-02 | High | Brute Force | No rate limiting on sign-in/sign-up — `sign-in.ts` + `[...all].ts` |
| H-03 | High | Enumeration | Auto-incrementing integer IDs reveal resource counts — all Prisma models |
| M-01 | Medium | Security Headers | No CSP, X-Content-Type-Options, or frame protections configured |
| M-02 | Medium | Input Validation | No schema-based validation (zod/valibot) — manual checks only |
| M-03 | Medium | Resource Limits | Unbounded in-memory cache without size constraints — `cache.ts:1` |
| M-04 | Medium | Error Logging | Stripe SDK error messages logged verbatim — `webhook.ts:38-41` |
| L-01 | Low | Client Storage | localStorage used for non-sensitive UI prefs only ✓ |
| L-02 | Low | DOM XSS | All 30 innerHTML usages verified safe (escaped or static) ✓ |
| L-03 | Low | Supply Chain | No automated dependency audit in CI |

---

## Areas Verified as Secure

| Area | Assessment |
|---|---|
| Authorization scoping | All DB queries include `ownerId` filtering — cross-user data access prevented ✓ |
| SQL injection | Prisma ORM used exclusively; zero raw SQL queries found ✓ |
| Stored XSS | Recipe instructions sanitized via `sanitize-html` with strict tag/attr allowlist ✓ |
| Reflected XSS | Astro's JSX-style interpolation auto-escapes template output ✓ |
| Stripe webhook | Raw body read (`request.text()`) + signature verification via `stripe.webhooks.constructEvent()` ✓ |
| Secrets management | `.env` is gitignored; no secrets in client-side code (`src/lib/auth-client.ts`) ✓ |
| Dynamic code execution | No `eval`, `new Function`, `setTimeout(string)` anywhere ✓ |
| File upload handling | Not applicable — no file upload endpoints exist ✓ |
| Command execution | No `child_process` usage anywhere ✓ |
| Prisma client | Proper `globalThis` singleton pattern for hot-reload dev; pool configured (max 3, 30s idle, 10s timeout) ✓ |
| Auth provider | Better Auth configured with explicit `trustedOrigins` ✓ |

---

## Recommended Fix Order

1. **C-01** — Implement CSRF token protection on all POST endpoints (highest impact, affects all protected routes)
2. **H-01** — Validate `successUrl`/`cancelUrl` against same-origin allowlist in Stripe checkout
3. **H-02** — Add rate limiting on `/api/auth/*` endpoints (Vercel Edge or in-app)
4. **M-01** — Set security headers via Astro middleware (CSP first, then clickjacking, nosniff)
5. **M-02** — Add zod schemas for form and API boundary validation
6. **H-03** — Consider UUID migration for public resource IDs (lower priority given ownerId scoping)
7. **M-03** — Add max size limit to in-memory cache
8. **M-04** — Redact external service error details from logs
9. **L-03** — Add dependency audit to CI pipeline
