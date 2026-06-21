// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import vercel from "@astrojs/vercel";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
