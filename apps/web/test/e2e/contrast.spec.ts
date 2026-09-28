import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";
import {
  collectContrastFailures,
  formatFailures,
} from "./support/contrast-probe";

/**
 * Gate de contraste por píxeles de las superficies públicas (hallazgo 2 del
 * review de landings).
 *
 * axe deja en `incomplete` —ni verde ni rojo— todo el texto que cae sobre un
 * `background-image`: el h1 del hero, el eyebrow de "cómo funciona", la banda
 * CTA y las filas de plan detrás de degradados. Esta sonda mide esos mismos
 * nodos sobre el píxel renderizado (degradados, `color-mix` en oklab y
 * superposiciones incluidos) y falla bajo AA, en claro y oscuro y en los dos
 * anchos del barrido.
 *
 * Criterio: WCAG 2.1 — 4.5:1 para texto normal, 3:1 para texto grande (≥24px o
 * ≥18.66px en negrita). La allowlist de `a11y.spec.ts` apunta a este archivo como
 * el ratio medido de cada nodo que axe no puede juzgar.
 */
const SURFACES = ["/", "/pricing"] as const;

const VIEWPORTS = {
  mobile: { width: 375, height: 800 },
  desktop: { width: 1280, height: 800 },
} as const;

for (const path of SURFACES) {
  for (const theme of ["light", "dark"] as const) {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      test(`contraste ${path}: AA en ${theme}, ${viewportName} (${viewport.width}px)`, async ({
        page,
        goto,
      }) => {
        await page.setViewportSize(viewport);
        await page
          .context()
          .addCookies([
            { name: "kitchcalc-theme", value: theme, url: url("/") },
          ]);
        await goto(path, { waitUntil: "hydration" });

        const failures = await collectContrastFailures(page);
        expect(failures.length, formatFailures(failures)).toBe(0);
      });
    }
  }
}
