import {
  copyFileSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");
const targets = [
  { path: resolve(root, "apps/web/.dev.vars"), url: true },
  { path: resolve(root, "apps/api/.dev.vars"), url: false },
];

function ensure(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content;
  return content.length && !content.endsWith("\n")
    ? `${content}\n${key}=${value}\n`
    : `${content}${key}=${value}\n`;
}

// ponytail: Vite's dep-optimizer cache goes stale when the dev server is
// killed mid-flight (e.g., wrangler rebundle crashing the process). The
// stale cache then 500s with
// "The file does not exist at .../deps_ssr/...". Wiping on every dev start
// is cheap (~50ms) and prevents the loop of "fix the cache, hit another
// stale entry, fix again". Nuxt keeps the cache outside node_modules
// (`vite.cacheDir` en `nuxt.config.ts`) para sobrevivir a pnpm install.
const viteCache = resolve(root, "apps/web/.vite-cache/web");
const astroCache = resolve(root, "apps/web/node_modules/.astro");
for (const dir of [viteCache, astroCache]) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (!existsSync(envPath)) {
  console.warn("[dev-vars] .env not found; skipping Cloudflare .dev.vars sync");
  process.exit(0);
}

const env = readFileSync(envPath, "utf8");

for (const { path: target, url } of targets) {
  let content = env;
  if (url) {
    content = ensure(content, "INTERNAL_API_URL", "http://localhost:8787");
  } else {
    content = ensure(content, "INTERNAL_API_HOST", "localhost:8787");
  }
  writeFileSync(target, content);
}

console.log(
  "[dev-vars] cleared the Nuxt/Vite cache; synced .env to apps/web/.dev.vars and apps/api/.dev.vars (with INTERNAL_API_URL / INTERNAL_API_HOST defaults)",
);
