// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import vercel from "@astrojs/vercel/serverless";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the repo root before Astro/Vite evaluates SSR package code.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Shim `cloudflare:workers` for local dev with Vercel adapter.
 * The middleware imports `import { env } from "cloudflare:workers"`.
 */
function shimCloudflareWorkers() {
  const VIRTUAL_ID = "cloudflare:workers";
  return {
    name: "shim-cloudflare-workers",
    resolveId(id) {
      if (id === VIRTUAL_ID) return "\0" + VIRTUAL_ID;
    },
    load(id) {
      if (id === "\0" + VIRTUAL_ID) {
        return `export const env = process.env;`;
      }
    },
  };
}
// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: vercel(),

  vite: {
    resolve: {
      alias: {
        "@/": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [shimCloudflareWorkers(), tailwindcss()],
  },

  integrations: [
    icon({
      include: {
        lucide: [
          "alert-triangle",
          "arrow-left",
          "arrow-up-circle",
          "bold",
          "book-open",
          "book-plus",
          "book-x",
          "calculator",
          "check",
          "check-circle",
          "chef-hat",
          "chevron-down",
          "chevron-left",
          "chevron-right",
          "clock",
          "cooking-pot",
          "copy",
          "credit-card",
          "dollar-sign",
          "ellipsis-vertical",
          "factory",
          "folder-open",
          "file-text",
          "folders",
          "heading",
          "info",
          "italic",
          "key-round",
          "list",
          "list-checks",
          "list-ordered",
          "list-tree",
          "lock",
          "log-out",
          "mail",
          "mail-check",
          "menu",
          "monitor",
          "moon",
          "move-horizontal",
          "package",
          "package-plus",
          "package-search",
          "palette",
          "pencil",
          "pie-chart",
          "plus",
          "printer",
          "save",
          "search",
          "search-x",
          "settings",
          "sun",
          "tag",
          "timer",
          "trash-2",
          "trending-down",
          "trending-up",
          "user",
          "x",
          "zap",
          "zoom-in",
        ],
      },
    }),
  ],
});
