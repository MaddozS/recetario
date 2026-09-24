# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# astro
See [astro/taste.md](astro/taste.md)
# nuxt
See [nuxt/taste.md](nuxt/taste.md)
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
- When asked to commit changes, group them into multiple logical/thematic commits separated by concern (one per feature/fix/refactor/chore) rather than a single combined commit — the user explicitly requests the changes be "separados de forma correcta". Use Conventional Commits format (`type(scope): subject`). Confidence: 0.70
- Aligns commit granularity with the roadmap task/plan structure: asked to commit a rework "based on the tasks", expects the commits to mirror those tasks/themes — and when the pending tree carries more themes than the plan's own commit table (extra recolor, nav, lazy-data, staging fixes, tooling artifacts), each gets its own commit instead of one catch-all. Files spanning several themes go whole into the dominant theme's commit rather than being split by hunks. Confidence: 0.55

# communication
- Prefers direct, unfiltered, "brutalism honest" feedback — do not soften or sugar-coat criticism of code, architecture, or decisions. The user values candor over diplomacy when evaluating the quality of their work. Confidence: 0.75
- Communicates in Spanish — expects replies, commit messages, PR titles/bodies, and summaries in Spanish. Confidence: 0.70
- The project's working artifacts are Spanish-language: code comments (including in config files like nuxt.config.ts, eslint.config.mjs, wrangler.jsonc), task/todo labels, and in-repo notes (AGENTS.md banners) are written in Spanish, not English. Confidence: 0.6
- Reports defects by attaching screenshots of the wrong state plus a reference capture of how it should look elsewhere — without naming files or components — and expects the agent to locate the implementation itself and match the reference; for runtime/API failures they additionally paste the exact raw Network response (e.g. `{"code":"FORBIDDEN","message":"CSRF validation failed"}`) and the action that triggers it ("Al editar una receta me sale este error"), so the agent diagnoses from that evidence instead of asking for reproduction steps. Confidence: 0.55
- When asked for the recommended solution to a problem, prefers a clear, structured description of what will be done — separating durable code fixes from one-off cleanup and infrastructure/config decisions — and expects to approve the approach before any changes are applied (not jumping straight into implementation). Confidence: 0.70

# ux
See [ux/taste.md](ux/taste.md)
# tooling
See [tooling/taste.md](tooling/taste.md)
# error-handling
- Best-effort operations (e.g., Accelerate cache invalidation) should log failures via `console.error` rather than silently swallowing them in an empty `catch` — silent failures hide operational bugs (e.g., stale data) and leave them untraceable. Confidence: 0.60
- A failed load must never be presented as an empty state: the composable propagates `error` (instead of catching it and returning `[]`) and the empty state is gated on `!pending && !error && length === 0`, so an API outage shows an explicit "couldn't load" alert rather than claiming the product has no data. The visible surface is the trace of the failure — a `console.error` alone (or leaving a dead alert branch) is not enough. Confidence: 0.65

# cloudflare-workers
See [cloudflare-workers/taste.md](cloudflare-workers/taste.md)
se `tsc --noEmit` for type-checking only — never `tsc --build`, which always emits `.js` files regardless of `declaration` settings. Confidence: 0.85

# cloudflare-workers
See [cloudflare-workers/taste.md](cloudflare-workers/taste.md)
