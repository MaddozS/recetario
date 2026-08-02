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

  vite: {
    resolve: {
      alias: [
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
  // eslint-disable-next-line no-undef
          target: process.env.INTERNAL_API_URL ?? "http://localhost:8787",
          changeOrigin: true,
        },
      },
    },
    plugins: [tailwindcss()],
  },
});
