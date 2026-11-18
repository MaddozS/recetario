// Closed list of DOMAIN_ERROR reasons. Add a new reason here and the
// `reason` field on ApiErrorResponse rejects anything not on the list.
export const DOMAIN_ERROR_REASONS = [
  'ingredient_in_use',
  'recipe_not_yours',
  'plan_not_found',
  'subscription_already_canceled',
  'subscription_not_found',
] as const;

export type DomainErrorReason = (typeof DOMAIN_ERROR_REASONS)[number];
