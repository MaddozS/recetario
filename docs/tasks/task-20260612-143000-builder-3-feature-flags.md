# Task: Feature Flag & Subscription Updates
Agent: kitchcalc-builder
Date: 2026-06-12
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md

## Goal
Enable `advanced_costs` feature flag for Basic and Pro tiers in subscription.ts. Update FREE_FEATURES and plan feature configurations.

## Context
- Feature flag `advanced_costs` exists in FREE_FEATURES (all false)
- Basic and Pro tiers should have it enabled
- Free tier should not have it
- Need to update subscription.ts and verify feature gating works

## Skills Required
- **better-auth-best-practices**: For auth/subscription configuration patterns

## Files Involved
- `src/lib/subscription.ts`: [modify] — enable advanced_costs for Basic+Pro

## Files the Subagent May Create or Edit
- [ ] `src/lib/subscription.ts`
- [ ] `docs/tasks/task-20260612-143000-builder-3-feature-flags-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: better-auth-best-practices
2. **Update subscription.ts**:
   - In FREE_FEATURES, keep advanced_costs: false
   - Ensure Basic and Pro plan configurations in database/seed have advanced_costs: true
   - Verify hasFeature(subscription, 'advanced_costs') returns true for Basic/Pro
3. **Verify**: Check that feature flag is correctly resolved in middleware/auth flow

## Expected Output
- advanced_costs: true for Basic and Pro tiers
- advanced_costs: false for Free tier
- Report saved to `docs/tasks/task-20260612-143000-builder-3-feature-flags-report.md`

## Guardrails
- Never modify spec files, plan files, analysis reports, or other task files
- Only modify subscription.ts
- Ensure feature flag logic is correct for tier resolution
