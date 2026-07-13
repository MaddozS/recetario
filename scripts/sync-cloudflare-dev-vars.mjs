import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, ".env");
const targets = [
  resolve(root, "apps/web/.dev.vars"),
  resolve(root, "apps/api/.dev.vars"),
];

if (!existsSync(source)) {
  console.warn("[dev-vars] .env not found; skipping Cloudflare .dev.vars sync");
  process.exit(0);
}

for (const target of targets) {
  copyFileSync(source, target);
}

console.log("[dev-vars] synced .env to apps/web/.dev.vars and apps/api/.dev.vars");
