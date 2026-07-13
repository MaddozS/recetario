# Graph Report - .  (2026-07-13)

## Corpus Check
- 314 files · ~242,043 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1156 nodes · 1647 edges · 73 communities (60 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Audit Data Layer|Audit Data Layer]]
- [[_COMMUNITY_Billing Data Layer|Billing Data Layer]]
- [[_COMMUNITY_Root Tooling|Root Tooling]]
- [[_COMMUNITY_Web Dependencies|Web Dependencies]]
- [[_COMMUNITY_Auth Product Specs|Auth Product Specs]]
- [[_COMMUNITY_Subscription Gates|Subscription Gates]]
- [[_COMMUNITY_Recipe Editors|Recipe Editors]]
- [[_COMMUNITY_Workspace Package Types|Workspace Package Types]]
- [[_COMMUNITY_Password Reset Flow|Password Reset Flow]]
- [[_COMMUNITY_Security and Theming|Security and Theming]]
- [[_COMMUNITY_Authentication Core|Authentication Core]]
- [[_COMMUNITY_Product Architecture|Product Architecture]]
- [[_COMMUNITY_Database Dependencies|Database Dependencies]]
- [[_COMMUNITY_Auth Dependencies|Auth Dependencies]]
- [[_COMMUNITY_Accent Color System|Accent Color System]]
- [[_COMMUNITY_Production Cost UI|Production Cost UI]]
- [[_COMMUNITY_Build Config A|Build Config A]]
- [[_COMMUNITY_Build Config B|Build Config B]]
- [[_COMMUNITY_API Workspace|API Workspace]]
- [[_COMMUNITY_Web TypeScript Config|Web TypeScript Config]]
- [[_COMMUNITY_Stripe Dependencies|Stripe Dependencies]]
- [[_COMMUNITY_Build Config C|Build Config C]]
- [[_COMMUNITY_Build Config D|Build Config D]]
- [[_COMMUNITY_Build Config E|Build Config E]]
- [[_COMMUNITY_Web Config A|Web Config A]]
- [[_COMMUNITY_Web Config B|Web Config B]]
- [[_COMMUNITY_Shared UI Components|Shared UI Components]]
- [[_COMMUNITY_Production Comparison Logic|Production Comparison Logic]]
- [[_COMMUNITY_Web Config C|Web Config C]]
- [[_COMMUNITY_Web Config D|Web Config D]]
- [[_COMMUNITY_Pricing Interactions|Pricing Interactions]]
- [[_COMMUNITY_Layout Transitions|Layout Transitions]]
- [[_COMMUNITY_Shared Base Config|Shared Base Config]]
- [[_COMMUNITY_Package Exports|Package Exports]]
- [[_COMMUNITY_Landing Feature Gallery|Landing Feature Gallery]]
- [[_COMMUNITY_Web Compiler Config|Web Compiler Config]]
- [[_COMMUNITY_Advanced Cost Features|Advanced Cost Features]]
- [[_COMMUNITY_Fixed Cost Components|Fixed Cost Components]]
- [[_COMMUNITY_Package Tooling|Package Tooling]]
- [[_COMMUNITY_Path Alias Config|Path Alias Config]]
- [[_COMMUNITY_Billing UI Components|Billing UI Components]]
- [[_COMMUNITY_API Runtime Config|API Runtime Config]]
- [[_COMMUNITY_Database Seeding|Database Seeding]]
- [[_COMMUNITY_Vercel Deployment|Vercel Deployment]]
- [[_COMMUNITY_Feature Flag Planning|Feature Flag Planning]]
- [[_COMMUNITY_Runtime Type Contracts|Runtime Type Contracts]]
- [[_COMMUNITY_Migration Recovery|Migration Recovery]]
- [[_COMMUNITY_Security Audit|Security Audit]]
- [[_COMMUNITY_Sequence Repair|Sequence Repair]]
- [[_COMMUNITY_Fixed Cost Migration|Fixed Cost Migration]]
- [[_COMMUNITY_Prisma Client Patch|Prisma Client Patch]]
- [[_COMMUNITY_Cloudflare Environment Sync|Cloudflare Environment Sync]]
- [[_COMMUNITY_Prisma Verification|Prisma Verification]]
- [[_COMMUNITY_Production Ingredients Table|Production Ingredients Table]]
- [[_COMMUNITY_Runtime Environment Types|Runtime Environment Types]]
- [[_COMMUNITY_Astro Configuration|Astro Configuration]]
- [[_COMMUNITY_Theme Flash Fixes|Theme Flash Fixes]]
- [[_COMMUNITY_Ingredient Finance UI|Ingredient Finance UI]]
- [[_COMMUNITY_Dialog Utilities|Dialog Utilities]]
- [[_COMMUNITY_Prettier Config|Prettier Config]]
- [[_COMMUNITY_Loading Skeleton|Loading Skeleton]]
- [[_COMMUNITY_Ingredient Management|Ingredient Management]]
- [[_COMMUNITY_Shared Package Index|Shared Package Index]]
- [[_COMMUNITY_Dialog Component|Dialog Component]]
- [[_COMMUNITY_Prisma Config|Prisma Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]

## God Nodes (most connected - your core abstractions)
1. `../../components/RecipeInstructions.astro` - 19 edges
2. `compilerOptions` - 18 edges
3. `@/layouts/Layout.astro` - 17 edges
4. `compilerOptions` - 17 edges
5. `compilerOptions` - 17 edges
6. `compilerOptions` - 17 edges
7. `compilerOptions` - 17 edges
8. `compilerOptions` - 17 edges
9. `compilerOptions` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `detectSignInEvent()` --calls--> `logAuditEvent()`  [INFERRED]
  apps/web/src/middleware.ts → packages/db/src/audit.ts
- `invalidateSubCache()` --calls--> `cacheDelete()`  [INFERRED]
  packages/billing/src/billing.ts → packages/db/src/cache.ts
- `Stripe Price ID Environment Variables` --conceptually_related_to--> `subscription_plans Table`  [INFERRED]
  /Users/maddozs/personal-projects/recetario/docs/planes/orquestador-monetizacion.md → /Users/maddozs/personal-projects/recetario/docs/planes/modulo-1-db-billing.md
- `production_advanced Feature Flag` --conceptually_related_to--> `Pro Plan`  [INFERRED]
  /Users/maddozs/personal-projects/recetario/docs/planes/produccion/00-indice.md → /Users/maddozs/personal-projects/recetario/docs/planes/modulo-4-pagina-pricing.md
- `production_save Feature Flag` --conceptually_related_to--> `Pro Plan`  [INFERRED]
  /Users/maddozs/personal-projects/recetario/docs/planes/produccion/00-indice.md → /Users/maddozs/personal-projects/recetario/docs/planes/modulo-4-pagina-pricing.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Auth P0 Security Gaps** — email_verification, password_reset_flow, rate_limiter, cache_system [EXTRACTED 1.00]
- **Landing Page Content Sections** — hero_section, features_section, how_it_works_section, pricing_section, cta_section [EXTRACTED 1.00]
- **Billing Database Functions** — seedSubscriptionPlans, getUserSubscription, createOrUpdateSubscription, cancelSubscription, countUserRecipes, countUserIngredients [EXTRACTED 1.00]
- **Stripe Payment Integration Stack** — stripe_checkout_route, stripe_webhook_route, stripe_portal_route [EXTRACTED 1.00]
- **Subscription Tier System** — free_plan, basic_plan, pro_plan [EXTRACTED 1.00]
- **Phase 1 sub-phases** — plan_produccion_migracion_basic, plan_produccion_mejoras_visualizacion, plan_produccion_fase1_cimientos [EXTRACTED 1.00]
- **Production planner feature gates** — feature_gate_production_planner, feature_gate_production_save, feature_gate_production_advanced [EXTRACTED 1.00]
- **Pro-tier production features (F3-F10)** — plan_produccion_calculo_client_side, plan_produccion_pedido_compras, plan_produccion_guardar_cargar_planes, plan_produccion_precios_interactivos, plan_produccion_exportacion_csv, plan_produccion_comparativa_escenarios, plan_produccion_checklist_mise_en_place, plan_produccion_integracion_stock [INFERRED 0.90]
- **Landing Page Performance Baselines** — dual_image_refactor, google_font_subsetting, responsive_breakpoint_coverage, lighthouse_target [INFERRED 0.85]
- **Constitution Design Gates** — token_bridge_rule, wcag_aa_contrast, accent_color_independence, csrf_protection, optimistic_theme_update [INFERRED 0.85]
- **Theme Mode Control Feature** — system_theme_preference, user_preferences_entity, flash_prevention_mechanism, apply_theme_fn, optimistic_theme_update, os_listener [INFERRED 0.90]
- **Theme Mode Control System** — theme_type_system, accent_color_system, layout_astro, applytheme_function, matchmedia_api, flash_prevention_script [INFERRED 0.90]
- **Settings Page Forms System** — settings_astro, feedback_alert_component, button_component, optimistic_save_pattern, form_state_machine [INFERRED 0.85]
- **Sign-In Authentication Entities** — user_entity, account_entity, session_entity, rate_limit_entry, audit_log [INFERRED 0.85]
- **Sign-In Source Files** — src_lib_auth_ts, src_lib_sign_in_ts, src_pages_sign_in_astro [EXTRACTED 1.00]
- **Sign-In Authentication Flow** — EmailPasswordSignIn, GoogleSignInExistingOnly, GenericErrorMessages, PostAuthRedirect, SessionGuard [EXTRACTED 1.00]
- **Sign-Up Authentication System** — BetterAuth, UserModel, signUpWithEmail, signInWithGoogle, additionalFields, mapProfileToUser [EXTRACTED 1.00]
- **Sign-Up Flow Components** — sign_up_feature, sign_up_email_form, sign_up_google_button, verification_email_screen, sign_up_session_guard, sign_up_navigation, user_with_first_last_name [EXTRACTED 1.00]
- **Auth Security & Infrastructure Layer** — rate_limiting_password_reset, audit_logging_password_reset, password_validation_rules, token_validation_rules, expired_link_handling, old_token_orphaning [INFERRED 0.85]
- **Password Reset Flow Components** — password_reset_feature, forgot_password_form, reset_password_form, password_reset_token_entity, password_reset_email_template, password_reset_countdown_timer, success_screen_reset, expired_link_handling [EXTRACTED 1.00]
- **Flujo de autenticación y verificación protegida** — debugging_test_auth_with_curl_better_auth, debugging_test_auth_with_curl_session_cookies, debugging_test_auth_with_curl_protected_pages, debugging_test_auth_with_curl_production_page [EXTRACTED 1.00]
- **Configuración de suscripción para habilitar features** — debugging_test_auth_with_curl_user, debugging_test_auth_with_curl_subscription_plans, debugging_test_auth_with_curl_subscriptions, debugging_test_auth_with_curl_feature_gates [EXTRACTED 1.00]
- **Flujo de fixtures de recetas** — debugging_test_auth_with_curl_recipe_data, debugging_test_auth_with_curl_tenant_ownership, debugging_test_auth_with_curl_foreign_keys [EXTRACTED 1.00]
- **Production Route Split** — docs_cloudflare_deployment_api_routes, docs_cloudflare_deployment_recetario_api, docs_cloudflare_deployment_site_routes, docs_cloudflare_deployment_recetario_web [EXTRACTED 1.00]

## Communities (73 total, 13 thin omitted)

### Community 0 - "Audit Data Layer"
Cohesion: 0.07
Nodes (71): cacheDelete(), cacheGet(), cacheSet(), normalizeCategory(), normalizeDesiredMargin(), normalizeFixedCostBase(), normalizeFixedCostHours(), normalizeFixedCostsPercentage() (+63 more)

### Community 1 - "Billing Data Layer"
Cohesion: 0.07
Nodes (41): logAuditEvent(), BASIC_FEATURES, cancelSubscription(), createOrUpdateSubscription(), CreateSubscriptionInput, FEATURE_FLAGS, getPlanByStripePriceId(), getStripeCustomerId() (+33 more)

### Community 2 - "Root Tooling"
Cohesion: 0.05
Nodes (42): devDependencies, @astrojs/check, @cloudflare/workers-types, dotenv, turbo, typescript, wrangler, engines (+34 more)

### Community 3 - "Web Dependencies"
Cohesion: 0.05
Nodes (43): dependencies, astro, astro-icon, @astrojs/vercel, dotenv, @iconify-json/lucide, @recetario/auth, @recetario/billing (+35 more)

### Community 4 - "Auth Product Specs"
Cohesion: 0.07
Nodes (42): Theme Mode Control, Settings Feedback UI, Sign-In Page Feature, Sign-Up Page Feature, Auth API Contract for Sign-Up, Better Auth, Email/Password Sign-In (US1), Generic Error Messages (+34 more)

### Community 5 - "Subscription Gates"
Cohesion: 0.09
Nodes (42): Astro.locals.subscription, Basic Plan, Modulo 5: Pagina /settings/billing, canCreateIngredient() Function, canCreateRecipe() Function, cancelSubscription() Function, countUserIngredients() Function, countUserRecipes() Function (+34 more)

### Community 6 - "Recipe Editors"
Cohesion: 0.08
Nodes (35): ../../components/InstructionsEditor.astro, ingredientJson, recipeIngredientIdsJson, ../../components/RecipeInstructions.astro, if(), pause(), reset(), stop() (+27 more)

### Community 7 - "Workspace Package Types"
Cohesion: 0.05
Nodes (38): default, types, default, devDependencies, @recetario/config, typescript, default, types (+30 more)

### Community 8 - "Password Reset Flow"
Cohesion: 0.10
Nodes (35): Password Reset Audit Logging, Better Auth Additional Fields Config, Better Auth Built-in Password Reset, Custom Password Reset Flow Decision, Expired Link Handling, Forgot Password Form, Google Profile Field Mapping, Google Sign-Up Configuration (+27 more)

### Community 9 - "Security and Theming"
Cohesion: 0.09
Nodes (30): Accent Color Independence, applyTheme() Function, Constitution Gate Checks, CSRF Protection, Dual Image to Single Image Refactor, Feature Flag Entity, Flash Prevention Mechanism, Google Font Subsetting (+22 more)

### Community 10 - "Authentication Core"
Cohesion: 0.17
Nodes (19): auth, authClient, initAuth(), getCsrfToken(), extractCookie(), generateToken(), getCsrfCookie(), getCsrfFormField() (+11 more)

### Community 11 - "Product Architecture"
Cohesion: 0.07
Nodes (29): Auth System Improvement Plan, Blueprint Indigo, Cache System, Coral, CTASection, Email Verification, FeaturesSection, HeroSection (+21 more)

### Community 12 - "Database Dependencies"
Cohesion: 0.07
Nodes (28): default, dependencies, dotenv, pg, @prisma/adapter-pg, @prisma/client, devDependencies, prisma (+20 more)

### Community 13 - "Auth Dependencies"
Cohesion: 0.08
Nodes (26): default, types, default, dependencies, better-auth, dotenv, devDependencies, @recetario/config (+18 more)

### Community 14 - "Accent Color System"
Cohesion: 0.08
Nodes (27): Account Routes, GET /health, /api/* Routes, apps/api, apps/web, Astro SSR, Auth Routes, Better Auth (+19 more)

### Community 15 - "Production Cost UI"
Cohesion: 0.08
Nodes (14): ACCENT_FAMILIES, ACCENT_LABELS, ACCENT_SHADES, accentBaseColors, AccentFamily, AccentShade, darkShadeMap, string (+6 more)

### Community 16 - "Build Config A"
Cohesion: 0.19
Nodes (17): @/components/ProductionFinancialSummary.astro, @/components/ProductionRecipeBreakdown.astro, @/components/ProductionRecipeSelector.astro, Print-Friendly Production Sheet, Production Planner Design Doc, aplicarRedondeoUnidadPequena(), calcularCantidadAjustada(), calculateProduction() (+9 more)

### Community 17 - "Build Config B"
Cohesion: 0.10
Nodes (19): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+11 more)

### Community 18 - "API Workspace"
Cohesion: 0.10
Nodes (19): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+11 more)

### Community 19 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (18): dependencies, hono, @recetario/auth, @recetario/billing, @recetario/db, devDependencies, @cloudflare/workers-types, typescript (+10 more)

### Community 20 - "Stripe Dependencies"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+10 more)

### Community 21 - "Build Config C"
Cohesion: 0.11
Nodes (18): default, dependencies, stripe, devDependencies, @recetario/config, typescript, exports, files (+10 more)

### Community 22 - "Build Config D"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+10 more)

### Community 23 - "Build Config E"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+10 more)

### Community 24 - "Web Config A"
Cohesion: 0.19
Nodes (19): Better Auth, Feature gates, Restricciones de claves foráneas, Guía de depuración de autenticación con curl, Scripts de prueba idempotentes, KitchCalc, Caché de suscripción del middleware, PostgreSQL (+11 more)

### Community 25 - "Web Config B"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+10 more)

### Community 26 - "Shared UI Components"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+10 more)

### Community 27 - "Production Comparison Logic"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+9 more)

### Community 28 - "Web Config C"
Cohesion: 0.19
Nodes (11): @/components/EmptyState.astro, @/components/FeedbackAlert.astro, @/components/IngredientFormFields.astro, @/components/RecipeMiniCard.astro, @/components/RecipeStats.astro, @/components/UnitCostDisplay.astro, UNIT_OPTIONS, parseNumberInput() (+3 more)

### Community 29 - "Web Config D"
Cohesion: 0.12
Nodes (18): 150ms input debounce, 20-plan per user limit, CompareState machine (idle/scenario_a_set/comparing), Hybrid server+client rendering strategy, localStorage state persistence, Margin color thresholds (green/yellow/red), 3-recipe limit for Basic, Costs vs Shopping view toggle (+10 more)

### Community 30 - "Pricing Interactions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+9 more)

### Community 31 - "Layout Transitions"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+9 more)

### Community 32 - "Shared Base Config"
Cohesion: 0.13
Nodes (10): redirectUrl, remainingIngredients, remainingRecipes, themeOptions, userInitial, remainingIngredients, remainingRecipes, countUserIngredients() (+2 more)

### Community 33 - "Package Exports"
Cohesion: 0.19
Nodes (11): @/components/Header.astro, @/layouts/LandingLayout.astro, accentCssVars, @/layouts/Layout.astro, errorCode, string, @/styles/global.css, @recetario/auth/client (+3 more)

### Community 34 - "Landing Feature Gallery"
Cohesion: 0.13
Nodes (14): compilerOptions, baseUrl, esModuleInterop, isolatedModules, module, moduleResolution, paths, resolveJsonModule (+6 more)

### Community 35 - "Web Compiler Config"
Cohesion: 0.14
Nodes (14): default, devDependencies, @recetario/config, typescript, exports, files, main, name (+6 more)

### Community 36 - "Advanced Cost Features"
Cohesion: 0.16
Nodes (8): @/components/landing/CTASection.astro, @/components/landing/FeaturesSection.astro, features, @/components/landing/HeroSection.astro, @/components/landing/HowItWorksSection.astro, @/components/landing/LandingFooter.astro, @/components/landing/LandingNavbar.astro, isAuthenticated

### Community 37 - "Fixed Cost Components"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, ignoreDeprecations, isolatedModules, module, moduleResolution, skipLibCheck, strict (+4 more)

### Community 38 - "Package Tooling"
Cohesion: 0.21
Nodes (12): advanced_costs Feature, calculateFixedCosts, calculateProductionNutrition, Advanced Fixed Costs Integration Plan, FixedCostLine, nutrition_info Feature, ProductionNutritionTable, production_advanced Feature (+4 more)

### Community 39 - "Path Alias Config"
Cohesion: 0.31
Nodes (8): ./FixedCostCard.astro, ../../components/PresentationCard.astro, ../../components/PresentationFixedCosts.astro, ../../components/RecipeActionsMenu.astro, ../../components/RecipeFixedCosts.astro, @/components/RecipeGridCard.astro, @recetario/ui, @recetario/ui/dialog

### Community 40 - "Billing UI Components"
Cohesion: 0.20
Nodes (9): exports, ./eslint.base.cjs, ./prettier.base.json, ./tsconfig.base.json, files, name, private, type (+1 more)

### Community 41 - "API Runtime Config"
Cohesion: 0.20
Nodes (9): compilerOptions, baseUrl, paths, plugins, exclude, extends, include, @/* (+1 more)

### Community 42 - "Database Seeding"
Cohesion: 0.39
Nodes (7): astro-icon/components, @/components/BillingSection.astro, @/components/RecipesSidebar.astro, @/components/UpgradePrompt.astro, @/components/landing/PricingSection.astro, PricingPlan, @recetario/billing

### Community 43 - "Vercel Deployment"
Cohesion: 0.25
Nodes (3): app, Bindings, ENV_KEYS

### Community 44 - "Feature Flag Planning"
Cohesion: 0.29
Nodes (5): adapter, __dirname, IngredientInput, prisma, RecipeInput

### Community 45 - "Runtime Type Contracts"
Cohesion: 0.29
Nodes (6): buildCommand, framework, installCommand, outputDirectory, rewrites, $schema

### Community 46 - "Migration Recovery"
Cohesion: 0.33
Nodes (6): FeatureFlag, Landing Page Audit Actions, Landing Page Data Model, Landing Page Spec Implementation Plan, PricingPlan, Token Bridge Rule

### Community 47 - "Security Audit"
Cohesion: 0.40
Nodes (4): ImportMeta, ImportMetaEnv, AppUser, Locals

### Community 48 - "Sequence Repair"
Cohesion: 0.70
Nodes (4): columnExists(), enumExists(), main(), tableExists()

### Community 49 - "Fixed Cost Migration"
Cohesion: 0.50
Nodes (4): CSRF Protection Missing (C-01), Open Redirect in Stripe Checkout (H-01), No Rate Limiting on Auth (H-02), Security Audit Report

### Community 52 - "Prisma Verification"
Cohesion: 0.50
Nodes (3): clientPath, replacement, source

### Community 53 - "Production Ingredients Table"
Cohesion: 0.50
Nodes (3): root, source, targets

### Community 55 - "Astro Configuration"
Cohesion: 1.00
Nodes (3): @/components/ProductionIngredientsTable.astro, formatQuantity(), smartQuantity()

## Knowledge Gaps
- **574 isolated node(s):** `extends`, `name`, `version`, `private`, `type` (+569 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Stripe` connect `Subscription Gates` to `Billing Data Layer`, `Build Config C`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `invalidateSubCache()` connect `Billing Data Layer` to `Audit Data Layer`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `cacheDelete()` connect `Audit Data Layer` to `Billing Data Layer`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `extends`, `name`, `version` to the rest of the system?**
  _575 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Audit Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.06641198942109904 - nodes in this community are weakly interconnected._
- **Should `Billing Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.07294117647058823 - nodes in this community are weakly interconnected._
- **Should `Root Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._