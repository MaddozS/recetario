import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import type { ConfigOptions } from "@nuxt/test-utils/playwright";

export default defineConfig<ConfigOptions>({
  testDir: "./test/e2e",
  // El fixture de Nuxt levanta un build y un server por worker: uno solo.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    nuxt: {
      rootDir: fileURLToPath(new URL(".", import.meta.url)),
      // El output del preset `cloudflare_module` no arranca con Node. El e2e
      // valida SSR + hidratación sobre un build de nodo; el bundle real de
      // Cloudflare lo cubren `nuxt build` y `wrangler:dry-run`.
      nuxtConfig: { nitro: { preset: "node-server" } },
      setupTimeout: 180_000,
    },
  },
});
