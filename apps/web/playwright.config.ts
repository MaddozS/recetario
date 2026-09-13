import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import type { ConfigOptions } from "@nuxt/test-utils/playwright";
import { STUB_API_URL } from "./test/e2e/support/global-setup";

// El `runtimeConfig` del fixture no sobrevive al build, así que el destino del
// relay viaja por entorno: el server que levanta el fixture hereda
// `process.env`.
process.env.INTERNAL_API_URL = STUB_API_URL;

export default defineConfig<ConfigOptions>({
  testDir: "./test/e2e",
  // El fixture de Nuxt levanta un build y un server por worker: uno solo.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  // Stub del API en :8788 para que el relay tenga un upstream determinista.
  globalSetup: fileURLToPath(
    new URL("./test/e2e/support/global-setup.ts", import.meta.url),
  ),
  use: {
    ...devices["Desktop Chrome"],
    nuxt: {
      rootDir: fileURLToPath(new URL(".", import.meta.url)),
      // El output del preset `cloudflare_module` no arranca con Node. El e2e
      // valida SSR + hidratación sobre un build de nodo; el bundle real de
      // Cloudflare lo cubren `nuxt build` + `wrangler:dry-run` y el smoke con
      // `wrangler dev`.
      nuxtConfig: { nitro: { preset: "node-server" } },
      // El fixture arranca el server con NODE_ENV=test, que hace que Vue
      // resuelva su build de desarrollo (SSR inestable). Se alinea con el
      // entorno real de despliegue. `NUXT_PUBLIC_INDEXABLE` reproduce la rama
      // indexable de producción (canonical + allow en robots.txt).
      env: { NODE_ENV: "production", NUXT_PUBLIC_INDEXABLE: "true" },
      setupTimeout: 180_000,
    },
  },
});
