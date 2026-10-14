import { expect, test } from '@nuxt/test-utils/playwright';
import { collectContrastFailures, formatFailures } from './support/contrast-probe';

/**
 * Gate de contraste por píxeles de las superficies públicas (hallazgo 2 del
 * review de landings).
 *
 * La sonda nació porque axe dejaba en `incomplete` —ni verde ni rojo— todo el
 * texto que caía sobre un `background-image` (los degradados del hero, de "cómo
 * funciona", de la banda CTA y el corte del scroller de planes). El rediseño los
 * quitó, así que hoy axe resuelve todas las parejas de las públicas; la sonda se
 * queda como el gate independiente a nivel de píxel: compone los `color-mix` en
 * oklab y las capas translúcidas tal como los pinta el navegador y falla bajo AA
 * en los dos anchos del barrido.
 *
 * Sólo en claro: las superficies públicas fuerzan el tema (`app.vue`), así que
 * una pasada oscura mediría el mismo documento con otro valor de cookie. La
 * matriz de tema sigue viva en el barrido de acentos de las privadas.
 *
 * Criterio: WCAG 2.1 — 4.5:1 para texto normal, 3:1 para texto grande (≥24px o
 * ≥18.66px en negrita). La allowlist de `a11y.spec.ts` apunta a este archivo como
 * el ratio medido de cada nodo que axe no puede juzgar.
 */
const SURFACES = ['/', '/funciones', '/pricing'] as const;

const VIEWPORTS = {
  mobile: { width: 375, height: 800 },
  desktop: { width: 1280, height: 800 },
} as const;

for (const path of SURFACES) {
  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    test(`contraste ${path}: AA en ${viewportName} (${viewport.width}px)`, async ({
      page,
      goto,
    }) => {
      await page.setViewportSize(viewport);
      await goto(path, { waitUntil: 'hydration' });

      const failures = await collectContrastFailures(page);
      expect(failures.length, formatFailures(failures)).toBe(0);
    });
  }
}
