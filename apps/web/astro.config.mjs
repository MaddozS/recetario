// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
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
  prefetch: false,

  vite: {
    resolve: {
      alias: [
        { find: "@/", replacement: path.resolve(__dirname, "./src") },
      ],
    },
    server: {
      fs: {
        allow: [path.resolve(__dirname, "../../")],
      },
      watch: {
        ignored: ["!**/packages/**"],
      },
      proxy: {
        "/api": {
          // eslint-disable-next-line no-undef
          target: process.env.INTERNAL_API_URL ?? "http://localhost:8787",
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      exclude: [
        "@recetario/auth",
        "@recetario/config",
        "@recetario/db",
        "@recetario/stripe",
        "@recetario/types",
      ],
    },
    plugins: [tailwindcss()],
  },
});
