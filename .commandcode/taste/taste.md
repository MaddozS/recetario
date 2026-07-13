# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# astro
- Avoid relying on data-* attributes passed to the Button component for JS selectors — Astro's Button may not forward them to the DOM. Use button[type="submit"] or other native selectors instead. Confidence: 0.70
- Avoid importing from server-side barrel packages (e.g., @recetario/billing) in Astro client-side <script> blocks — they may re-export Node.js-only modules (Stripe, dotenv, pg) that silently crash the entire script. Inline simple functions instead. Confidence: 0.70

# debugging
- For Astro component bugs, prefer static code analysis over live browser testing (e.g., agent-browser, curl). Read the code first and trace the logic before launching the dev server. Confidence: 0.60

# database
- Recipe ingredients should allow the same ingredient to appear multiple times in a recipe — each row can have its own quantity, unit, and comment. Do not enforce a unique constraint on (recipeId, ingredientId). Confidence: 0.85
- Use PostgreSQL/Prisma Postgres — do NOT activate D1 as the primary database. Keep the existing Prisma Postgres setup. Confidence: 0.80

# prisma
- When using a Proxy-based lazy initialization pattern for PrismaClient (or any singleton), always add an early guard at the top of the init function: `if (_instance) return _instance;` — otherwise every property access creates a new pool, exhausting connections. Confidence: 0.70

# cloudflare-workers
See [cloudflare-workers/taste.md](cloudflare-workers/taste.md)
