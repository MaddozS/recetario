/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";
import node from "@astrojs/node";

// astro/config ships Vite 8's UserConfig; vitest/config ships Vite 7's. The
// shapes are compatible for our uses but the type identity is not. Cast the
// vitest-shaped config so getViteConfig accepts it without a TS2345.
const testConfig = {
  test: {
    include: ["src/**/*.test.{ts,astro}"],
  },
  server: {
    port: 4321,
    hmr: {
      clientPort: 4321
    }
  },
} as Parameters<typeof getViteConfig>[0];

export default getViteConfig(testConfig, {
  // Override the cloudflare adapter with node so vitest doesn't spin up workerd.
  // The page + layout don't import cloudflare:workers directly, so the node
  // adapter is sufficient for the Container API in tests.
  output: "server",
  adapter: node({ mode: "standalone" }),
});
