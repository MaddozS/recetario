# Graph Report - .  (2026-07-24)

## Corpus Check
- 245 files · ~178,305 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1167 nodes · 1625 edges · 77 communities (67 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.86)
- Token cost: 16,512 input · 3,862 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Database Access Layer|Database Access Layer]]
- [[_COMMUNITY_Stripe Billing|Stripe Billing]]
- [[_COMMUNITY_Specs Auth & Settings|Specs: Auth & Settings]]
- [[_COMMUNITY_Root Package Config|Root Package Config]]
- [[_COMMUNITY_Web App Package Config|Web App Package Config]]
- [[_COMMUNITY_Recipe Instructions Editor|Recipe Instructions Editor]]
- [[_COMMUNITY_UI Package Config|UI Package Config]]
- [[_COMMUNITY_API README|API README]]
- [[_COMMUNITY_Auth & Password Reset|Auth & Password Reset]]
- [[_COMMUNITY_Theme & CSS Architecture|Theme & CSS Architecture]]
- [[_COMMUNITY_Auth Package Core|Auth Package Core]]
- [[_COMMUNITY_DB Package Config|DB Package Config]]
- [[_COMMUNITY_Auth Package Config|Auth Package Config]]
- [[_COMMUNITY_UI Components & Accent Colors|UI Components & Accent Colors]]
- [[_COMMUNITY_API Package Config|API Package Config]]
- [[_COMMUNITY_Production Calculator|Production Calculator]]
- [[_COMMUNITY_Package READMEs & Lazy Init|Package READMEs & Lazy Init]]
- [[_COMMUNITY_Auth Build Config|Auth Build Config]]
- [[_COMMUNITY_UI Build Config|UI Build Config]]
- [[_COMMUNITY_Auth tsconfig|Auth tsconfig]]
- [[_COMMUNITY_Billing Package Config|Billing Package Config]]
- [[_COMMUNITY_Billing Build Config|Billing Build Config]]
- [[_COMMUNITY_Config Build Config|Config Build Config]]
- [[_COMMUNITY_DB Build Config|DB Build Config]]
- [[_COMMUNITY_Types Build Config|Types Build Config]]
- [[_COMMUNITY_UI tsconfig|UI tsconfig]]
- [[_COMMUNITY_Billing tsconfig|Billing tsconfig]]
- [[_COMMUNITY_Empty State Component|Empty State Component]]
- [[_COMMUNITY_Config tsconfig|Config tsconfig]]
- [[_COMMUNITY_DB tsconfig|DB tsconfig]]
- [[_COMMUNITY_Types tsconfig|Types tsconfig]]
- [[_COMMUNITY_View Transitions|View Transitions]]
- [[_COMMUNITY_Config Package Config|Config Package Config]]
- [[_COMMUNITY_Config Base tsconfig|Config Base tsconfig]]
- [[_COMMUNITY_Types Package Config|Types Package Config]]
- [[_COMMUNITY_Landing CTA Section|Landing CTA Section]]
- [[_COMMUNITY_API tsconfig|API tsconfig]]
- [[_COMMUNITY_Fixed Cost Card|Fixed Cost Card]]
- [[_COMMUNITY_Shared Components|Shared Components]]
- [[_COMMUNITY_API Server Entry|API Server Entry]]
- [[_COMMUNITY_Settings Page|Settings Page]]
- [[_COMMUNITY_Web tsconfig|Web tsconfig]]
- [[_COMMUNITY_Landing Page Screenshots|Landing Page Screenshots]]
- [[_COMMUNITY_Settings Feedback UI Spec|Settings Feedback UI Spec]]
- [[_COMMUNITY_Prisma Seed|Prisma Seed]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_Feature Flags|Feature Flags]]
- [[_COMMUNITY_Web Env Types|Web Env Types]]
- [[_COMMUNITY_Prisma Migration Fix|Prisma Migration Fix]]
- [[_COMMUNITY_Favicon Images|Favicon Images]]
- [[_COMMUNITY_Ingredients Page Backgrounds|Ingredients Page Backgrounds]]
- [[_COMMUNITY_Production Page Backgrounds|Production Page Backgrounds]]
- [[_COMMUNITY_Recipe Page Backgrounds|Recipe Page Backgrounds]]
- [[_COMMUNITY_CSRF Security|CSRF Security]]
- [[_COMMUNITY_Prisma Sequence Fix|Prisma Sequence Fix]]
- [[_COMMUNITY_Fixed Costs Seed|Fixed Costs Seed]]
- [[_COMMUNITY_Prisma Worker Client Patch|Prisma Worker Client Patch]]
- [[_COMMUNITY_Sync Cloudflare Dev Vars|Sync Cloudflare Dev Vars]]
- [[_COMMUNITY_Prisma Verify Script|Prisma Verify Script]]
- [[_COMMUNITY_Closer Agent Merge Spec|Closer Agent Merge Spec]]
- [[_COMMUNITY_Agent Domain Docs|Agent Domain Docs]]
- [[_COMMUNITY_Auth Env Types|Auth Env Types]]
- [[_COMMUNITY_Astro Config|Astro Config]]
- [[_COMMUNITY_Button Loading States|Button Loading States]]
- [[_COMMUNITY_Better Auth Signup Config|Better Auth Signup Config]]
- [[_COMMUNITY_Prettier Config|Prettier Config]]
- [[_COMMUNITY_User Name Fields|User Name Fields]]
- [[_COMMUNITY_Financial Summary|Financial Summary]]

## God Nodes (most connected - your core abstractions)
1. `KitchCalc Recetario` - 20 edges
2. `../../components/RecipeInstructions.astro` - 19 edges
3. `compilerOptions` - 18 edges
4. `@/layouts/Layout.astro` - 17 edges
5. `compilerOptions` - 17 edges
6. `compilerOptions` - 17 edges
7. `compilerOptions` - 17 edges
8. `compilerOptions` - 17 edges
9. `compilerOptions` - 17 edges
10. `compilerOptions` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Per-user data isolation` --semantically_similar_to--> `ownerId multi-tenancy`  [INFERRED] [semantically similar]
  README.md → AGENTS.md
- `detectSignInEvent()` --calls--> `logAuditEvent()`  [INFERRED]
  apps/web/src/middleware.ts → packages/db/src/audit.ts
- `Account management routes` --conceptually_related_to--> `Better Auth`  [INFERRED]
  apps/api/README.md → AGENTS.md
- `Auth API routes` --conceptually_related_to--> `Better Auth`  [INFERRED]
  apps/api/README.md → AGENTS.md
- `KitchCalc` --uses--> `Tailwind CSS`  [EXTRACTED]
  PRODUCT.md → DESIGN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
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
- **Authentication System** — recetario_agents_better_auth, recetario_agents_google_oauth, recetario_agents_middleware_auth, recetario_agents_spa_routing, api_readme_auth_routes, api_readme_account_routes [INFERRED 0.85]
- **Data Persistence Layer** — recetario_agents_postgresql, recetario_agents_prisma_orm, recetario_agents_ownerid_multi_tenancy, recetario_agents_data_invariants [INFERRED 0.85]
- **Deployment Targets** — recetario_agents_astrojs_vercel, api_readme_cloudflare_worker, recetario_pnpm_workspace_monorepo [INFERRED 0.85]
- **@recetario Monorepo Packages** — packages_auth_readme, packages_billing_readme, packages_config_readme, packages_db_readme, packages_types_readme, packages_ui_readme [EXTRACTED 1.00]
- **July 24 2026 Architecture Review Candidates** — specs_lazy_init_factory, specs_shared_env_utilities, specs_decompose_auth_config, specs_split_api_route_modules, specs_auth_barrel_dedup, specs_decompose_page_files [EXTRACTED 1.00]
- **KitchCalc Brand Visual Identity** — public_favicon_png, public_favicon_svg, public_kitchcalc_logo_png, public_kitchcalc_logo_svg, public_kitchcalc_logo_webp [INFERRED 0.95]
- **App Marketing Screenshot Set** — public_ss_ingredientes_png, public_ss_ingredientes_webp, public_ss_produccion_png, public_ss_produccion_webp, public_ss_recetas_png, public_ss_recetas_webp, app_concept_landing_screenshots [INFERRED 0.85]

## Communities (77 total, 10 thin omitted)

### Community 0 - "Database Access Layer"
Cohesion: 0.06
Nodes (74): getDefaultPrisma(), getUserAuditLog(), logAuditEvent(), cacheDelete(), cacheGet(), cacheSet(), normalizeCategory(), normalizeDesiredMargin() (+66 more)

### Community 1 - "Stripe Billing"
Cohesion: 0.08
Nodes (41): BASIC_FEATURES, cancelSubscription(), createOrUpdateSubscription(), CreateSubscriptionInput, FEATURE_FLAGS, getPlanByStripePriceId(), getPricingPlans(), getStripeCustomerId() (+33 more)

### Community 2 - "Specs: Auth & Settings"
Cohesion: 0.06
Nodes (50): Theme Mode Control, Settings Feedback UI, Sign In Page, Sign-Up Page Feature, Auth API Contract for Sign-Up, Better Auth, Email/Password Sign-In (US1), Generic Error Messages (+42 more)

### Community 3 - "Root Package Config"
Cohesion: 0.05
Nodes (42): devDependencies, @astrojs/check, @cloudflare/workers-types, dotenv, turbo, typescript, wrangler, engines (+34 more)

### Community 4 - "Web App Package Config"
Cohesion: 0.05
Nodes (43): dependencies, astro, astro-icon, @astrojs/vercel, dotenv, @iconify-json/lucide, @recetario/auth, @recetario/billing (+35 more)

### Community 5 - "Recipe Instructions Editor"
Cohesion: 0.08
Nodes (35): ../../components/InstructionsEditor.astro, ingredientJson, recipeIngredientIdsJson, ../../components/RecipeInstructions.astro, if(), pause(), reset(), stop() (+27 more)

### Community 6 - "UI Package Config"
Cohesion: 0.05
Nodes (38): default, types, default, devDependencies, @recetario/config, typescript, default, types (+30 more)

### Community 7 - "API README"
Cohesion: 0.07
Nodes (35): Account management routes, Auth API routes, Cloudflare Worker, API environment variables, @recetario/api Hono API, Stripe API routes, Astro 6 SSR, astro-icon whitelist (+27 more)

### Community 8 - "Auth & Password Reset"
Cohesion: 0.10
Nodes (35): Password Reset Audit Logging, Better Auth Additional Fields Config, Better Auth Built-in Password Reset, Custom Password Reset Flow Decision, Expired Link Handling, Forgot Password Form, Google Profile Field Mapping, Google Sign-Up Configuration (+27 more)

### Community 9 - "Theme & CSS Architecture"
Cohesion: 0.09
Nodes (30): Accent Color Independence, applyTheme() Function, Constitution Gate Checks, CSRF Protection, Dual Image to Single Image Refactor, Feature Flag Entity, Flash Prevention Mechanism, Google Font Subsetting (+22 more)

### Community 10 - "Auth Package Core"
Cohesion: 0.17
Nodes (19): auth, authClient, initAuth(), getCsrfToken(), extractCookie(), generateToken(), getCsrfCookie(), getCsrfFormField() (+11 more)

### Community 11 - "DB Package Config"
Cohesion: 0.07
Nodes (28): default, dependencies, dotenv, pg, @prisma/adapter-pg, @prisma/client, @recetario/config, devDependencies (+20 more)

### Community 12 - "Auth Package Config"
Cohesion: 0.08
Nodes (26): default, types, default, dependencies, better-auth, dotenv, @recetario/config, devDependencies (+18 more)

### Community 13 - "UI Components & Accent Colors"
Cohesion: 0.08
Nodes (14): ACCENT_FAMILIES, ACCENT_LABELS, ACCENT_SHADES, accentBaseColors, AccentFamily, AccentShade, darkShadeMap, string (+6 more)

### Community 14 - "API Package Config"
Cohesion: 0.09
Nodes (22): dependencies, hono, pg, @prisma/adapter-pg, @prisma/client, @recetario/auth, @recetario/billing, @recetario/config (+14 more)

### Community 15 - "Production Calculator"
Cohesion: 0.19
Nodes (16): @/components/ProductionFinancialSummary.astro, @/components/ProductionRecipeBreakdown.astro, @/components/ProductionRecipeSelector.astro, @/components/UpgradePrompt.astro, aplicarRedondeoUnidadPequena(), calcularCantidadAjustada(), calculateProduction(), ingredientUnitCost() (+8 more)

### Community 16 - "Package READMEs & Lazy Init"
Cohesion: 0.17
Nodes (22): lazyInit Factory Function, @recetario/auth Package, @recetario/billing Package, @recetario/config Package, @recetario/db Package, @recetario/types Package, @recetario/ui Package, Icon Button Homologation Spec (+14 more)

### Community 17 - "Auth Build Config"
Cohesion: 0.10
Nodes (19): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+11 more)

### Community 18 - "UI Build Config"
Cohesion: 0.10
Nodes (19): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+11 more)

### Community 19 - "Auth tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+10 more)

### Community 20 - "Billing Package Config"
Cohesion: 0.11
Nodes (18): default, dependencies, @recetario/config, stripe, devDependencies, typescript, exports, files (+10 more)

### Community 21 - "Billing Build Config"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+10 more)

### Community 22 - "Config Build Config"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+10 more)

### Community 23 - "DB Build Config"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+10 more)

### Community 24 - "Types Build Config"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, ignoreDeprecations, isolatedModules (+10 more)

### Community 25 - "UI tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+10 more)

### Community 26 - "Billing tsconfig"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+9 more)

### Community 27 - "Empty State Component"
Cohesion: 0.19
Nodes (11): @/components/EmptyState.astro, @/components/FeedbackAlert.astro, @/components/IngredientFormFields.astro, @/components/RecipeMiniCard.astro, @/components/RecipeStats.astro, @/components/UnitCostDisplay.astro, UNIT_OPTIONS, parseNumberInput() (+3 more)

### Community 28 - "Config tsconfig"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+9 more)

### Community 29 - "DB tsconfig"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+9 more)

### Community 30 - "Types tsconfig"
Cohesion: 0.11
Nodes (17): compilerOptions, baseUrl, composite, declaration, declarationMap, esModuleInterop, isolatedModules, module (+9 more)

### Community 31 - "View Transitions"
Cohesion: 0.18
Nodes (11): @/components/Header.astro, @/layouts/LandingLayout.astro, accentCssVars, @/layouts/Layout.astro, errorCode, string, @/styles/global.css, @recetario/auth/client (+3 more)

### Community 32 - "Config Package Config"
Cohesion: 0.12
Nodes (16): devDependencies, typescript, exports, ./eslint.base.cjs, ./lazy, ./prettier.base.json, ./tsconfig.base.json, files (+8 more)

### Community 33 - "Config Base tsconfig"
Cohesion: 0.13
Nodes (14): compilerOptions, baseUrl, esModuleInterop, isolatedModules, module, moduleResolution, paths, resolveJsonModule (+6 more)

### Community 34 - "Types Package Config"
Cohesion: 0.14
Nodes (14): default, devDependencies, @recetario/config, typescript, exports, files, main, name (+6 more)

### Community 35 - "Landing CTA Section"
Cohesion: 0.16
Nodes (8): @/components/landing/CTASection.astro, @/components/landing/FeaturesSection.astro, features, @/components/landing/HeroSection.astro, @/components/landing/HowItWorksSection.astro, @/components/landing/LandingFooter.astro, @/components/landing/LandingNavbar.astro, isAuthenticated

### Community 36 - "API tsconfig"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, ignoreDeprecations, isolatedModules, module, moduleResolution, skipLibCheck, strict (+4 more)

### Community 37 - "Fixed Cost Card"
Cohesion: 0.23
Nodes (11): ./FixedCostCard.astro, ../../components/PresentationCard.astro, ../../components/PresentationFixedCosts.astro, @/components/ProductionIngredientsTable.astro, formatQuantity(), smartQuantity(), ../../components/RecipeActionsMenu.astro, ../../components/RecipeFixedCosts.astro (+3 more)

### Community 38 - "Shared Components"
Cohesion: 0.27
Nodes (6): astro-icon/components, @/components/BillingSection.astro, @/components/RecipesSidebar.astro, @/components/landing/PricingSection.astro, PricingPlan, @recetario/billing

### Community 39 - "API Server Entry"
Cohesion: 0.20
Nodes (4): prisma, app, Bindings, ENV_KEYS

### Community 40 - "Settings Page"
Cohesion: 0.20
Nodes (9): redirectUrl, remainingIngredients, remainingRecipes, themeOptions, userInitial, remainingIngredients, remainingRecipes, countUserIngredients() (+1 more)

### Community 41 - "Web tsconfig"
Cohesion: 0.20
Nodes (9): compilerOptions, baseUrl, paths, plugins, exclude, extends, include, @/* (+1 more)

### Community 42 - "Landing Page Screenshots"
Cohesion: 0.54
Nodes (8): Landing Page Screenshots, PNG-to-WebP Screenshot Format Pair, Ingredients Page Screenshot (PNG), Ingredients Page Screenshot (WebP), Production Page Screenshot (PNG), Production Page Screenshot (WebP), Recipes Page Screenshot (PNG), Recipes Page Screenshot (WebP)

### Community 43 - "Settings Feedback UI Spec"
Cohesion: 0.29
Nodes (7): Settings Feedback UI Quickstart, Implementation Plan Template, Sign-Up Page Quickstart, Landing Page Specification, Specification Quality Checklist Practice, Settings Feedback UI Specification, Sign-In Page Specification

### Community 44 - "Prisma Seed"
Cohesion: 0.29
Nodes (5): adapter, __dirname, IngredientInput, prisma, RecipeInput

### Community 45 - "Vercel Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, installCommand, outputDirectory, rewrites, $schema

### Community 46 - "Feature Flags"
Cohesion: 0.33
Nodes (6): FeatureFlag, Landing Page Audit Actions, Landing Page Data Model, Landing Page Spec Implementation Plan, PricingPlan, Token Bridge Rule

### Community 47 - "Web Env Types"
Cohesion: 0.40
Nodes (4): ImportMeta, ImportMetaEnv, AppUser, Locals

### Community 48 - "Prisma Migration Fix"
Cohesion: 0.70
Nodes (4): columnExists(), enumExists(), main(), tableExists()

### Community 49 - "Favicon Images"
Cohesion: 0.40
Nodes (5): Favicon PNG (32×32), Favicon SVG — Stylized icon mark (dark/light adaptive), KitchCalc Logo PNG (512×512), KitchCalc Logo SVG — Recipe cost calculator brand mark, KitchCalc Logo WebP (512×512)

### Community 50 - "Ingredients Page Backgrounds"
Cohesion: 0.50
Nodes (5): Ingredients Page Dark Theme Screenshot, Ingredients Page Dark Theme Screenshot (WebP), Ingredients Page Light Theme Screenshot, Ingredients Page Light Theme Screenshot (WebP), Ingredients Page Screenshot Set

### Community 51 - "Production Page Backgrounds"
Cohesion: 0.50
Nodes (5): Production Page Dark Theme Screenshot, Production Page Dark Theme Screenshot (WebP), Production Page Light Theme Screenshot, Production Page Light Theme Screenshot (WebP), Production Page Screenshot Set

### Community 52 - "Recipe Page Backgrounds"
Cohesion: 0.50
Nodes (5): Recipe Page Dark Theme Screenshot, Recipe Page Dark Theme Screenshot (WebP), Recipe Page Light Theme Screenshot, Recipe Page Light Theme Screenshot (WebP), Recipe Page Screenshot Set

### Community 53 - "CSRF Security"
Cohesion: 0.50
Nodes (4): CSRF Protection Missing (C-01), Open Redirect in Stripe Checkout (H-01), No Rate Limiting on Auth (H-02), Security Audit Report

### Community 56 - "Prisma Worker Client Patch"
Cohesion: 0.50
Nodes (3): clientPath, replacement, source

### Community 57 - "Sync Cloudflare Dev Vars"
Cohesion: 0.50
Nodes (3): root, source, targets

### Community 59 - "Closer Agent Merge Spec"
Cohesion: 0.50
Nodes (4): Closer Agent Merge Design Spec, Analyst Subagent, Closer Agent, Synthesizer Subagent

### Community 60 - "Agent Domain Docs"
Cohesion: 0.67
Nodes (3): Domain Documentation Guide, Issue Tracker Conventions, Triage Labels Mapping

## Knowledge Gaps
- **586 isolated node(s):** `extends`, `name`, `version`, `private`, `type` (+581 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `invalidateSubCache()` connect `Stripe Billing` to `Database Access Layer`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `cacheDelete()` connect `Database Access Layer` to `Stripe Billing`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `../../components/RecipeInstructions.astro` connect `Recipe Instructions Editor` to `Empty State Component`, `Shared Components`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KitchCalc Recetario` (e.g. with `@recetario/api Hono API` and `Monorepo workspace`) actually correct?**
  _`KitchCalc Recetario` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `extends`, `name`, `version` to the rest of the system?**
  _598 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Database Access Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.06414565826330532 - nodes in this community are weakly interconnected._
- **Should `Stripe Billing` be split into smaller, more focused modules?**
  _Cohesion score 0.07529411764705882 - nodes in this community are weakly interconnected._