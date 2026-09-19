import { fileURLToPath } from "node:url";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/unit/**/*.spec.ts"],
          environment: "node",
        },
        // Los módulos puros importan `shared/utils/**` por `#shared` (igual que
        // la app); el proyecto `unit` no pasa por Nuxt, así que el alias se
        // declara aquí.
        resolve: {
          alias: {
            "#shared": fileURLToPath(new URL("./shared", import.meta.url)),
          },
        },
      },
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/**/*.spec.ts"],
          environment: "nuxt",
        },
      }),
    ],
  },
});
