# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# astro
See [astro/taste.md](astro/taste.md)
# debugging
- For Astro component bugs, prefer static code analysis over live browser testing (e.g., agent-browser, curl). Read the code first and trace the logic before launching the dev server. Confidence: 0.60
- When editing a workspace package whose package.json `main`/`exports` points to `dist/` (pre-compiled output), dev server HMR and restarts will NOT pick up source changes — a manual rebuild (`pnpm --filter <pkg> build`) is required before the fix takes effect in wrangler dev. Always check whether the package is consumed from dist before declaring a fix deployed. Confidence: 0.80

# database
- Recipe ingredients should allow the same ingredient to appear multiple times in a recipe — each row can have its own quantity, unit, and comment. Do not enforce a unique constraint on (recipeId, ingredientId). Confidence: 0.85
- Use PostgreSQL/Prisma Postgres — do NOT activate D1 as the primary database. Keep the existing Prisma Postgres setup. Confidence: 0.80

# architecture
See [architecture/taste.md](architecture/taste.md)
# prisma
- When using a Proxy-based lazy initialization pattern for PrismaClient (or any singleton), always add an early guard at the top of the init function: `if (_instance) return _instance;` — otherwise every property access creates a new pool, exhausting connections. Confidence: 0.70
- Prefers using generated Prisma input types (e.g., `RecipePresentationUpdateInput`, `RecipePresentationUncheckedUpdateInput`) directly as function parameters rather than hand-rolling custom DTOs or input validation types. When the generated type covers the needed fields, use it as-is — the explicit instruction "using only prisma models generated" signals this is a deliberate architectural choice, not a shortcut. May carve out exceptions for specific operations (e.g., delete) where generated types don't map cleanly. Confidence: 0.95
- When a generated Prisma `CreateInput` type includes required relation fields (e.g., `recipe` on `RecipePresentationCreateInput`) but the function already receives that relation identifier as a separate parameter (e.g., `recipeId`), prefer switching to the `UncheckedCreateInput` variant (which accepts scalar foreign keys directly) and using `Omit<>` to drop the one field the function provides itself. Do NOT hand-roll a custom DTO when `Omit<>` on a generated type suffices. Also applies with `Pick<>` for narrower parameter types. Confidence: 0.90

- [LEGACY — superseded by above] When a generated Prisma `CreateInput` type includes required relation fields (e.g., `recipe` on `RecipePresentationCreateInput`) but the function already receives that relation identifier as a separate parameter (e.g., `recipeId`), do NOT force-fit the generated type — define a local input type that matches the function's actual API surface. Export it if sibling modules need it for type casts. The rule is: use generated types when they fit, not when they fight. Confidence: 0.70
- For complex Prisma queries with includes, derives return types from `Prisma.RecipeGetPayload` (or `Prisma.$Payload` in newer Prisma versions) rather than hand-writing types that mirror the query shape. This keeps the return type in sync with the actual query structure and avoids drift. Confidence: 0.65

# workflow
See [workflow/taste.md](workflow/taste.md)
# git
- Do not add the assistant (CommandCodeBot) as a commit co-author via `Co-authored-by:` trailers. User prefers clean authorship. Confidence: 0.90
- When asked to commit changes, proactively scan the entire working tree for related uncommitted changes — don't limit to only the files from the most recent conversation turn. The user expects thoroughness. Confidence: 0.60

# communication
- Prefers direct, unfiltered, "brutalism honest" feedback — do not soften or sugar-coat criticism of code, architecture, or decisions. The user values candor over diplomacy when evaluating the quality of their work. Confidence: 0.75

# ux
See [ux/taste.md](ux/taste.md)
# tooling
- In pnpm monorepos, move Vite's dependency-optimization cache (`vite.cacheDir`) outside `node_modules/` — pnpm restructures `node_modules` on dependency changes, which invalidates cached SSR module paths in `.vite/deps_ssr/` and causes "file does not exist in optimize deps directory" errors. Keeping the cache in a separate directory (e.g., `../.vite-cache/web`) and gitignoring it lets the cache survive `pnpm install` and workspace restructures. Confidence: 0.70

- Prefers keeping source directories free of `tsc --build` artifacts — `.d.ts`, `.d.ts.map`, `.js`, and `.js.map` files should not litter the source tree alongside `.ts` sources. Runtime-required generated code (e.g., `prisma generate` output in `prisma/generated/`) is fine, but stale build output from a missing `outDir` or `declaration: true` config should be cleaned proactively. Confidence: 0.90
- For workspace packages consumed as raw `.ts` via their `exports` field (not pre-compiled to `dist/`), the `build` script should use `tsc --noEmit` for type-checking only — never `tsc --build`, which always emits `.js` files regardless of `declaration` settings. Confidence: 0.85

# cloudflare-workers
See [cloudflare-workers/taste.md](cloudflare-workers/taste.md)
