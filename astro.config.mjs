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
        lucide: ["*"], // Loads entire Lucide icon set
      },
    }),
  ],
});
