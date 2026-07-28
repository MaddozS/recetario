// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import cloudflare from "@astrojs/cloudflare";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the repo root before Astro/Vite evaluates SSR package code.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare(),

  vite: {
    resolve: {
      alias: [
        { find: /^@prisma\/client\/runtime\/.*\.wasm-base64\.mjs$/, replacement: path.resolve(__dirname, "./src/lib/empty-wasm-base64.mjs") },
        { find: "@/", replacement: path.resolve(__dirname, "./src") },
      ],
    },
    // Forward `/api/auth/*` to the API worker in dev so the browser-side
    // Better Auth client can hit the same origin. The web app does not own
    // the Better Auth instance; in production the middleware relays via
    // the `API` service binding (see `src/middleware.ts`).
    server: {
      proxy: {
        "/api/auth": {
          target: process.env.INTERNAL_API_URL ?? "http://localhost:8787",
          changeOrigin: true,
        },
      },
    },
    plugins: [tailwindcss()],
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
