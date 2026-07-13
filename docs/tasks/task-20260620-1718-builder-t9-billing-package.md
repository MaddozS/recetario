# Task T9: Billing package
Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T7 PASS (verified ✓), parallel with T8

## Goal

Move Stripe + subscription + plan config + formatters + the `db/billing.ts` file to `packages/billing/src/`. Update the 4 import sites that consume `db/billing.ts` (middleware + 3 Stripe API routes). Remove billing from the `packages/db/src/index.ts` barrel.

## Context

After T7, `apps/web/src/lib/db/billing.ts` was updated in-place to use `@recetario/db` imports (but the file itself is still in `apps/web/`). This task moves it to `packages/billing/src/billing.ts` and consolidates all billing-related code.

**Files to move**:
- `apps/web/src/lib/stripe.ts` → `packages/billing/src/stripe.ts` (zero-dep, exports `stripe` singleton)
- `apps/web/src/lib/subscription.ts` → `packages/billing/src/subscription.ts` (uses db/billing types — cycle risk!)
- `apps/web/src/lib/plans-config.ts` → `packages/billing/src/plans-config.ts` (FREE_FEATURES, plan tier mappings)
- `apps/web/src/lib/formatters.ts` → `packages/billing/src/formatters.ts` (currency formatters)
- `apps/web/src/lib/db/billing.ts` → `packages/billing/src/billing.ts` (queries + Stripe sync)

**Critical: the `subscription.ts` ↔ `db/billing.ts` cycle**

Currently:
- `subscription.ts` imports `UserSubscription` type from `db/billing.ts`
- `db/billing.ts` doesn't import from `subscription.ts` (no cycle)

After the move:
- `subscription.ts` needs `UserSubscription` type → comes from `billing.ts` (now in same package, easy)
- `billing.ts` may need helpers from `subscription.ts`? Check.
- If there's a cycle, the package barrel needs careful design

**Files that import from `@/lib/db/billing` (4 sites to update)**:
1. `apps/web/src/middleware.ts` — `import { getUserSubscription, seedSubscriptionPlans } from "@/lib/db/billing"`
2. `apps/web/src/pages/api/stripe/checkout.ts` — `import { getPlanByStripePriceId, getStripeCustomerId } from "@/lib/db/billing"`
3. `apps/web/src/pages/api/stripe/portal.ts` — `import { getUserSubscription } from "@/lib/db/billing"`
4. `apps/web/src/pages/api/stripe/webhook.ts` — `import { createOrUpdateSubscription, cancelSubscription, markSubscriptionPastDue, seedSubscriptionPlans } from "@/lib/db/billing"`

**Files that import from `@/lib/subscription`**:
- `apps/web/src/middleware.ts`
- Various Astro pages that check feature flags

**Files that import from `@/lib/stripe`**:
- `apps/web/src/lib/db/billing.ts` (moves to packages/billing/src/billing.ts)
- 3 Stripe API routes

**Files that import from `@/lib/plans-config`**:
- `apps/web/src/lib/db/billing.ts` (moves)

**Files that import from `@/lib/formatters`**:
- `apps/web/src/lib/db/billing.ts` (moves)
- Possibly other consumers

## Task Scope

- **Type**: new + extends-existing
- **Pre-existing components**:
  - T7 output: `apps/web/src/lib/db/billing.ts` (already imports from `@recetario/db`)
  - T7 output: `apps/web/src/lib/{stripe,subscription,plans-config,formatters}.ts`
  - T7 output: `packages/billing/package.json` (placeholder)
  - T7 output: `packages/db/src/index.ts` (still re-exports billing — needs cleanup)
- **New deliverables**:
  - 5 files in `packages/billing/src/`
  - `packages/billing/package.json` with deps (stripe, @recetario/db)
  - `packages/billing/src/index.ts` barrel
  - `packages/billing/README.md` with env vars
  - 4 Stripe-related consumer files updated
  - `packages/db/src/index.ts` updated to remove billing re-export
  - All `apps/web/src/lib/{stripe,subscription,plans-config,formatters,db/billing}.ts` deleted
- **Dependencies**: T7 PASS (verified ✓)

## Skills Required

- **stripe-best-practices**: For Stripe client setup, webhook handling, subscription management

## Files Involved

- `apps/web/src/lib/db/billing.ts` — read + move (use updated imports from T7)
- `apps/web/src/lib/stripe.ts` — read + move
- `apps/web/src/lib/subscription.ts` — read + move
- `apps/web/src/lib/plans-config.ts` — read + move
- `apps/web/src/lib/formatters.ts` — read + move
- 4 API route consumers
- `apps/web/src/middleware.ts`
- Other pages that use `hasFeature` (subscription helper)

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `packages/billing/package.json` — modify
- [ ] `packages/billing/src/index.ts` — new
- [ ] `packages/billing/src/stripe.ts` — new (moved)
- [ ] `packages/billing/src/subscription.ts` — new (moved)
- [ ] `packages/billing/src/plans-config.ts` — new (moved)
- [ ] `packages/billing/src/formatters.ts` — new (moved)
- [ ] `packages/billing/src/billing.ts` — new (moved from apps/web/src/lib/db/billing.ts)
- [ ] `packages/billing/README.md` — new
- [ ] `packages/db/src/index.ts` — modify (remove billing re-export)
- [ ] `apps/web/src/lib/stripe.ts` — delete
- [ ] `apps/web/src/lib/subscription.ts` — delete
- [ ] `apps/web/src/lib/plans-config.ts` — delete
- [ ] `apps/web/src/lib/formatters.ts` — delete
- [ ] `apps/web/src/lib/db/billing.ts` — delete
- [ ] `apps/web/src/lib/db/` — delete (directory, now empty)
- [ ] `apps/web/src/middleware.ts` — modify (imports from @recetario/billing)
- [ ] `apps/web/src/pages/api/stripe/checkout.ts` — modify
- [ ] `apps/web/src/pages/api/stripe/portal.ts` — modify
- [ ] `apps/web/src/pages/api/stripe/webhook.ts` — modify
- [ ] All other consumer files in `apps/web/src/` using subscription/stripe/plans-config/formatters — modify
- [ ] `apps/web/package.json` — modify (add @recetario/billing dep)
- [ ] `docs/tasks/task-20260620-1718-builder-t9-billing-package-report.md` — the report file (mandatory)

## Technical Steps

1. **Load skill**: `stripe-best-practices`

2. **Read all 5 files to be moved**:
   - `apps/web/src/lib/db/billing.ts` (already updated to use @recetario/db in T7)
   - `apps/web/src/lib/stripe.ts` (uses process.env)
   - `apps/web/src/lib/subscription.ts` (imports UserSubscription from db/billing)
   - `apps/web/src/lib/plans-config.ts` (FREE_FEATURES)
   - `apps/web/src/lib/formatters.ts` (formatCurrency, timeAgo)

3. **Find all consumers**:
   ```bash
   grep -rln "from \"@/lib/db/billing\"" apps/web/src/ > /tmp/billing-consumers.txt
   grep -rln "from \"@/lib/subscription\"" apps/web/src/ >> /tmp/billing-consumers.txt
   grep -rln "from \"@/lib/stripe\"" apps/web/src/ >> /tmp/billing-consumers.txt
   grep -rln "from \"@/lib/plans-config\"" apps/web/src/ >> /tmp/billing-consumers.txt
   grep -rln "from \"@/lib/formatters\"" apps/web/src/ >> /tmp/billing-consumers.txt
   grep -rln "from \"@/lib/db/.*\"" apps/web/src/ | grep -v billing  # other db imports
   cat /tmp/billing-consumers.txt | sort -u
   ```

4. **Create `packages/billing/src/` directory**:
   ```bash
   mkdir -p packages/billing/src
   ```

5. **Move 5 files**:
   ```bash
   mv apps/web/src/lib/stripe.ts packages/billing/src/stripe.ts
   mv apps/web/src/lib/subscription.ts packages/billing/src/subscription.ts
   mv apps/web/src/lib/plans-config.ts packages/billing/src/plans-config.ts
   mv apps/web/src/lib/formatters.ts packages/billing/src/formatters.ts
   mv apps/web/src/lib/db/billing.ts packages/billing/src/billing.ts
   ```

6. **Update internal imports** in moved files:
   - `billing.ts` (moved from db/billing.ts) has `import { prisma } from "@recetario/db"` (set in T7). Verify it still works.
   - `billing.ts` may have `import { ... } from "./helpers"` (relative). Update to `import { ... } from "@recetario/db"` (helpers moved in T7).
   - `billing.ts` may have `import { stripe } from "@/lib/stripe"` (still existed in apps/web at T7 time). Update to `import { stripe } from "./stripe.js"` (local relative in same package).
   - `billing.ts` may have `import { ... } from "./types"`. Update to `import { ... } from "@recetario/db"` or relative.
   - `billing.ts` may have `import { ... } from "./cache"`. Update to `import { ... } from "@recetario/db"`.
   - `billing.ts` may have `import { ... } from "./formatters"`. Update to `import { ... } from "./formatters.js"` (local).
   - `billing.ts` may have `import { ... } from "./plans-config"`. Update to `import { ... } from "./plans-config.js"` (local).
   - `subscription.ts` has `import { UserSubscription } from "@/lib/db/billing"` (now in same package). Update to `import { UserSubscription } from "./billing.js"` (local).
   - `subscription.ts` may have `import { ... } from "@/lib/db/billing"`. Update to `import { ... } from "./billing.js"`.

7. **Decide where types live**:
   - `UserSubscription` is a type that `subscription.ts` and other consumers need
   - Define in `billing.ts` (where it's used) or extract to a `types.ts` in the package
   - Per the spec: "subscription's UserSubscription type moves with billing. db types (subscriptionPlan, subscription) stay in packages/db/. No circular dep if billing only imports from db, not vice versa."
   - So `UserSubscription` lives in `billing.ts` (now in `packages/billing/src/`)

8. **Create `packages/billing/src/index.ts`** barrel:
   ```ts
   export { stripe } from "./stripe";
   export { hasFeature, ... } from "./subscription";
   export { FREE_FEATURES, ... } from "./plans-config";
   export { formatCurrency, timeAgo } from "./formatters";
   export {
     getUserSubscription,
     seedSubscriptionPlans,
     getPlanByStripePriceId,
     getStripeCustomerId,
     createOrUpdateSubscription,
     cancelSubscription,
     markSubscriptionPastDue,
     syncPlansFromStripe,
   } from "./billing";
   export type { UserSubscription, ... } from "./billing";
   ```

9. **Update `packages/billing/package.json`**:
   ```json
   {
     "name": "@recetario/billing",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "exports": {
       ".": {
         "types": "./src/index.ts",
         "default": "./src/index.ts"
       }
     },
     "files": ["src"],
     "dependencies": {
       "stripe": "22.1.1"
     },
     "peerDependencies": {
       "@recetario/db": "workspace:^"
     }
   }
   ```

10. **Create `packages/billing/README.md`**:
    - Purpose: Stripe + subscription + plan config
    - Usage examples for each export
    - Env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*
    - Dependencies: requires @recetario/db peer

11. **Update `packages/db/src/index.ts`** to remove billing re-export:
    - Remove `export * from "./billing"` (or whatever the current line is)
    - The barrel should no longer export billing queries

12. **Update `apps/web/src/middleware.ts`**:
    - `import { getUserSubscription, seedSubscriptionPlans } from "@/lib/db/billing"` → `import { getUserSubscription, seedSubscriptionPlans } from "@recetario/billing"`
    - `import { hasFeature } from "@/lib/subscription"` → `import { hasFeature } from "@recetario/billing"`

13. **Update 3 Stripe API routes**:
    - `apps/web/src/pages/api/stripe/checkout.ts`: `import { getPlanByStripePriceId, getStripeCustomerId } from "@/lib/db/billing"` → `@recetario/billing`
    - `apps/web/src/pages/api/stripe/portal.ts`: `import { getUserSubscription } from "@/lib/db/billing"` → `@recetario/billing`
    - `apps/web/src/pages/api/stripe/webhook.ts`: `import { createOrUpdateSubscription, cancelSubscription, markSubscriptionPastDue, seedSubscriptionPlans } from "@/lib/db/billing"` → `@recetario/billing`

14. **Update other pages that use hasFeature or subscription helpers**:
    ```bash
    grep -rln "from \"@/lib/subscription\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/subscription"|from "@recetario/billing"|g'
    grep -rln "from \"@/lib/stripe\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/stripe"|from "@recetario/billing"|g'
    grep -rln "from \"@/lib/plans-config\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/plans-config"|from "@recetario/billing"|g'
    grep -rln "from \"@/lib/formatters\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/formatters"|from "@recetario/billing"|g'
    grep -rln "from \"@/lib/db/billing\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/db/billing"|from "@recetario/billing"|g'
    # Also single-quoted variants
    grep -rln "from '@/lib/subscription'" apps/web/src/ | xargs sed -i '' "s|from '@/lib/subscription'|from '@recetario/billing'|g"
    # etc.
    ```

15. **Delete `apps/web/src/lib/db/` directory** (now empty):
    ```bash
    rmdir apps/web/src/lib/db
    ```

16. **Update `apps/web/package.json`**:
    - Add `"@recetario/billing": "workspace:^"` to dependencies
    - Remove `stripe` from apps/web deps (moved to packages/billing)
    - (Other deps: formatters/subscription/plans-config are internal to billing package)

17. **Reinstall**:
    ```bash
    pnpm install
    ```

18. **Verify build**:
    ```bash
    pnpm turbo run build
    ```

19. **Verify astro check**:
    ```bash
    pnpm --filter @recetario/web astro check
    ```

20. **Verify dev server**:
    ```bash
    cd apps/web && timeout 15 pnpm dev
    ```

21. **Verify no circular dep**:
    ```bash
    # billing imports from db, but db should NOT import from billing
    grep -rln "from \"@recetario/billing\"" packages/db/src/ 2>/dev/null
    # Should return nothing
    ```

22. **Verify @/lib/* doesn't have any billing-related files left**:
    ```bash
    ls apps/web/src/lib/
    # Should NOT have: stripe.ts, subscription.ts, plans-config.ts, formatters.ts, db/ directory
    ```

23. **Write report** to `docs/tasks/task-20260620-1718-builder-t9-billing-package-report.md` with:
    - **Skills Used**: `stripe-best-practices` etc.
    - **Files moved**: list (5 files)
    - **Files deleted**: list
    - **Files modified**: list
    - **Consumer count updated**: how many files had imports updated
    - **Circular dep check**: confirmed no cycles
    - **Build / check / dev**: all pass
    - **Issues encountered**: any + how resolved

## Expected Output

- **Code changes**:
  - 5 files in `packages/billing/src/`
  - `packages/billing/package.json` with stripe + peerDep on @recetario/db
  - `packages/billing/README.md`
  - `packages/db/src/index.ts` updated (removed billing)
  - All 4 Stripe API consumers + middleware + other pages updated
  - 5 files deleted from `apps/web/src/lib/`
  - `apps/web/src/lib/db/` directory deleted
- **Report**: `docs/tasks/task-20260620-1718-builder-t9-billing-package-report.md`

## Guardrails

- **DO NOT** modify any billing logic (just move files)
- **DO NOT** change Stripe version
- **DO NOT** add new dependencies
- **DO NOT** commit changes
- **DO NOT** run `pnpm eslint .` or `pnpm format` (pre-existing T1 broken state)
- **DO NOT** create circular dependencies (db must not import from billing)
- **MUST** preserve byte-identical content for all moved files (no logic changes)
- **MUST** verify build, astro check, dev server all pass before declaring done
- **MUST** verify no circular deps between packages
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list. If new files are needed, STOP and report.
- **Read discipline**: Max 15 file reads. Should be ~8 reads (5 billing + middleware + 1-2 API routes + 1 page).
