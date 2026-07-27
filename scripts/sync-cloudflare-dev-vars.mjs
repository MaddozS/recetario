import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
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
  "[dev-vars] synced .env to apps/web/.dev.vars and apps/api/.dev.vars (with INTERNAL_API_URL / INTERNAL_API_HOST defaults)",
);
