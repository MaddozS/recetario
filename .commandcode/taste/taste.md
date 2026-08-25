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
See [prisma/taste.md](prisma/taste.md)
# workflow
See [workflow/taste.md](workflow/taste.md)
# git
- Do not add the assistant (CommandCodeBot) as a commit co-author via `Co-authored-by:` trailers. User prefers clean authorship. Confidence: 0.90
- When asked to commit changes, proactively scan the entire working tree for related uncommitted changes — don't limit to only the files from the most recent conversation turn. The user expects thoroughness. Confidence: 0.60
- Before committing, proactively scan the staged changes for sensitive data (API keys, tokens, secrets, credentials, DB URLs) and confirm none are included before creating the commit. Confidence: 0.85

# communication
- Prefers direct, unfiltered, "brutalism honest" feedback — do not soften or sugar-coat criticism of code, architecture, or decisions. The user values candor over diplomacy when evaluating the quality of their work. Confidence: 0.75
- Communicates in Spanish — expects replies, commit messages, and summaries in Spanish. Confidence: 0.60

# ux
See [ux/taste.md](ux/taste.md)
# tooling
- In pnpm monorepos, move Vite's dependency-optimization cache (`vite.cacheDir`) outside `node_modules/` — pnpm restructures `node_modules` on dependency changes, which invalidates cached SSR module paths in `.vite/deps_ssr/` and causes "file does not exist in optimize deps directory" errors. Keeping the cache in a separate directory (e.g., `../.vite-cache/web`) and gitignoring it lets the cache survive `pnpm install` and workspace restructures. Confidence: 0.70

- Prefers keeping source directories free of `tsc --build` artifacts — `.d.ts`, `.d.ts.map`, `.js`, and `.js.map` files should not litter the source tree alongside `.ts` sources. Runtime-required generated code (e.g., `prisma generate` output in `prisma/generated/`) is fine, but stale build output from a missing `outDir` or `declaration: true` config should be cleaned proactively. Confidence: 0.90
- For workspace packages consumed as raw `.ts` via their `exports` field (not pre-compiled to `dist/`), the `build` script should use `tsc --noEmit` for type-checking only — never `tsc --build`, which always emits `.js` files regardless of `declaration` settings. Confidence: 0.85

# cloudflare-workers
See [cloudflare-workers/taste.md](cloudflare-workers/taste.md)
se `tsc --noEmit` for type-checking only — never `tsc --build`, which always emits `.js` files regardless of `declaration` settings. Confidence: 0.85

# cloudflare-workers
See [cloudflare-workers/taste.md](cloudflare-workers/taste.md)
