# cloudflare-workers
- Pin @astrojs/cloudflare to ^13.x (e.g., 13.7.0) when using Astro 6 — the v14 adapter requires Astro 7. Confidence: 0.75
- Patch the generated Prisma client (client.ts) to guard import.meta.url with a typeof check before calling fileURLToPath — in Workers runtime it can be undefined. Use a post-generate script. Confidence: 0.70
- Add workerd: true to allowBuilds in pnpm-workspace.yaml — Wrangler depends on it and pnpm blocks it by default. Confidence: 0.70
- In local dev, proxy /api/* from Astro's Vite dev server to the Hono API worker (e.g., http://127.0.0.1:8787) so both can run together through Turbo. Confidence: 0.65
- List all workspace packages in vite.ssr.noExternal (in astro.config.mjs) so Vite bundles them through its SSR pipeline instead of loading them raw in the Workers sandbox — otherwise @prisma/client's createRequire leaks the module global that doesn't exist in workerd. Confidence: 0.70
- When creating Vite plugins to shim virtual modules, use both resolveId (with \0 prefix) and load hooks — the load hook alone may not intercept bare specifier imports in Vite v7's SSR dev runtime. Confidence: 0.70
