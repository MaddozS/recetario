import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { PREFERENCE_ACCENT_COLORS } from "@recetario/types";

/**
 * Barrido de accesibilidad (Task 13a) sobre las superficies reales del rework:
 * públicas indexables, auth y privadas, en 375 y 1280. Bloqueante: cualquier
 * violación `serious`/`critical` falla la suite. Las `moderate`/`minor` se
 * listan en el mensaje de fallo para corregirlas o documentarlas con una
 * allowlist explícita en este archivo (nunca en silencio).
 */

type Violation = Awaited<
  ReturnType<AxeBuilder["analyze"]>
>["violations"][number];

const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

const PUBLIC_PAGES = ["/", "/pricing", "/privacy", "/terms"] as const;
const AUTH_PAGES = ["/sign-in"] as const;
const PRIVATE_PAGES = [
  "/recipes",
  "/ingredients",
  "/settings",
  "/produccion",
] as const;

function describeViolations(violations: Violation[]): string {
  return violations
    .map(
      (violation) =>
        `- ${violation.id} [${violation.impact}] ${violation.help}\n` +
        violation.nodes
          .map(
            (node) =>
              `    ${node.target.join(" ")}\n` +
              `      ${(node.failureSummary ?? "")
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .join(" | ")}`,
          )
          .join("\n"),
    )
    .join("\n");
}

/**
 * Deja la página en su estado final antes del barrido.
 *
 * Las páginas privadas entran con animaciones de opacidad (`.animate-fade-in` y
 * las `statFadeIn`/`cardFadeIn` con `animation-fill-mode: both` de las stats y
 * las cards), y la landing usa `v-reveal` (`[data-reveal]` en opacidad 0 hasta
 * entrar en viewport). Sin asentar, axe mide colores mezclados con la animación
 * (o elementos aún en opacidad 0) y reporta contrastes falsos. Se neutralizan
 * *todas* las animaciones (duración 0 ⇒ estado final con `both`) y se fuerza el
 * estado revelado.
 */
async function settle(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
      [data-reveal],
      .reveal-item,
      [data-reveal] .reveal-item {
        opacity: 1 !important;
        transform: none !important;
      }
    `,
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

async function scan(page: Page) {
  await settle(page);
  return await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
}

function blocking(violations: Violation[]): Violation[] {
  return violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
}

function expectNoBlocking(violations: Violation[]): void {
  // Se aserta la longitud con el detalle como mensaje: el diff de objetos de
  // Playwright es ilegible cuando hay muchas violaciones.
  const serious = blocking(violations);
  expect(serious.length, describeViolations(serious)).toBe(0);
}

for (const path of PUBLIC_PAGES) {
  test(`pública ${path}: sin violaciones blocking en 375 y 1280`, async ({
    page,
    goto,
  }) => {
    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);
      await goto(path, { waitUntil: "hydration" });
      const { violations } = await scan(page);
      expectNoBlocking(violations);
    }
  });
}

for (const path of AUTH_PAGES) {
  test(`auth ${path}: sin violaciones blocking en 375 y 1280`, async ({
    page,
    goto,
  }) => {
    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);
      await goto(path, { waitUntil: "hydration" });
      const { violations } = await scan(page);
      expectNoBlocking(violations);
    }
  });
}

for (const path of PRIVATE_PAGES) {
  test(`privada ${path}: sin violaciones blocking en 375 y 1280`, async ({
    page,
    goto,
  }) => {
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: "stub-session-token",
        url: url("/"),
      },
    ]);

    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);
      await goto(path, { waitUntil: "hydration" });
      const { violations } = await scan(page);
      expectNoBlocking(violations);
    }
  });
}

/**
 * Superficies privadas donde el acento elegido por el usuario pinta texto y
 * fondos: chips/pills del listado, tabla de ingredientes (preview de costo),
 * planificador, detalle de receta y settings (swatches, tabs, facturación).
 * Las públicas y las de auth siempre son coral, así que las cubre el barrido
 * base.
 */
const ACCENT_SURFACES = [
  "/recipes",
  "/recipes/1",
  "/ingredients",
  "/produccion",
  "/settings?tab=preferences",
  "/settings?tab=billing",
] as const;

/**
 * Hallazgo 13a #2: el barrido base sólo medía el acento por defecto de cada
 * zona (coral en público/auth, esmeralda en privado). Aquí se recorren las 7
 * familias con las cookies de presentación —cookie-first, el middleware las
 * respeta por encima de la preferencia de la sesión— en claro y oscuro.
 *
 * Sólo 1280: las familias cambian colores, no geometría, y 375/1280 ya se
 * cubre en el barrido base de cada superficie. Encontró deuda real (texto del
 * acento sobre tinte y sobre fondo neutro en indigo/violet/blue/rose/coral
 * dark y emerald/amber/coral light); el arreglo vive en los componentes.
 */
for (const path of ACCENT_SURFACES) {
  test(`acentos ${path}: sin violaciones blocking en 7 familias x claro/oscuro`, async ({
    page,
    goto,
  }) => {
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: "stub-session-token",
        url: url("/"),
      },
    ]);
    await page.setViewportSize(DESKTOP);

    for (const accent of PREFERENCE_ACCENT_COLORS) {
      for (const theme of ["light", "dark"] as const) {
        await page.context().addCookies([
          { name: "kitchcalc-accent", value: accent, url: url("/") },
          { name: "kitchcalc-theme", value: theme, url: url("/") },
        ]);
        await goto(path, { waitUntil: "hydration" });
        const { violations } = await scan(page);
        const serious = blocking(violations);
        expect(
          serious.length,
          `${path} · acento ${accent} · ${theme}\n${describeViolations(serious)}`,
        ).toBe(0);
      }
    }
  });
}
