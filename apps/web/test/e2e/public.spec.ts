import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";

const SITE_URL = "https://app.kitchcalc.com";

/** Tope de tabulaciones para llegar al control que se está verificando. */
const MAX_TABS = 40;

const PUBLIC_PAGES = [
  {
    path: "/",
    title: "KitchCalc | Calcula el costo real de tus recetas",
    description:
      "Gestiona costos, márgenes y precios de tus recetas de forma simple y rápida.",
    canonical: `${SITE_URL}/`,
  },
  {
    path: "/pricing",
    title: "Planes y precios | KitchCalc",
    description:
      "Compara los planes Free, Basic y Pro de KitchCalc: recetas, ingredientes y planificador de producción. Suscripción segura con Stripe.",
    canonical: `${SITE_URL}/pricing`,
  },
  {
    path: "/privacy",
    title: "Política de privacidad | KitchCalc",
    description:
      "Cómo KitchCalc recopila, usa y protege tus datos: autenticación, pagos con Stripe, cookies y seguridad.",
    canonical: `${SITE_URL}/privacy`,
  },
  {
    path: "/terms",
    title: "Términos del servicio | KitchCalc",
    description:
      "Condiciones de uso de KitchCalc: cuentas, planes y pagos, límites de uso, propiedad de los datos y cancelación.",
    canonical: `${SITE_URL}/terms`,
  },
] as const;

function attributeMaps(html: string, tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\s+([^>]*)>`, "gi"))].map(
    (match) => {
      const attributes: Record<string, string> = {};
      for (const attribute of (match[1] ?? "").matchAll(/([\w:-]+)="([^"]*)"/g)) {
        attributes[attribute[1] ?? ""] = attribute[2] ?? "";
      }
      return attributes;
    },
  );
}

function metaContent(
  html: string,
  attribute: "name" | "property",
  value: string,
): string | null {
  return (
    attributeMaps(html, "meta").find((tag) => tag[attribute] === value)
      ?.content ?? null
  );
}

function canonicalHref(html: string): string | null {
  return (
    attributeMaps(html, "link").find((tag) => tag.rel === "canonical")?.href ??
    null
  );
}

for (const page of PUBLIC_PAGES) {
  test(`SSR de ${page.path} con metadata única, canonical absoluto y lang es`, async ({
    request,
  }) => {
    const response = await request.get(url(page.path));
    expect(response.status()).toBe(200);

    const html = await response.text();

    expect(html).toContain('lang="es"');
    expect(html).toContain(`<title>${page.title}</title>`);
    expect(metaContent(html, "name", "description")).toBe(page.description);
    expect(metaContent(html, "name", "robots")).toBe("index, follow");
    expect(metaContent(html, "property", "og:title")).toBe(page.title);
    expect(metaContent(html, "property", "og:url")).toBe(page.canonical);
    expect(metaContent(html, "property", "og:image")).toBe(
      `${SITE_URL}/kitchcalc_logo.webp`,
    );
    expect(canonicalHref(html)).toBe(page.canonical);

    // Un solo canonical y un solo h1 por página.
    expect(
      attributeMaps(html, "link").filter((tag) => tag.rel === "canonical"),
    ).toHaveLength(1);
    expect([...html.matchAll(/<h1[\s>]/g)]).toHaveLength(1);
  });
}

test("las rutas no públicas siguen fuera de índices y sin canonical", async ({
  request,
}) => {
  const response = await request.get(url("/sign-in"));
  const html = await response.text();

  expect(metaContent(html, "name", "robots")).toBe("noindex, nofollow");
  expect(canonicalHref(html)).toBeNull();
});

test("robots.txt permite sólo las públicas y publica el sitemap", async ({
  request,
}) => {
  const response = await request.get(url("/robots.txt"));
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");

  const body = await response.text();
  for (const allow of [
    "Allow: /$",
    "Allow: /pricing$",
    "Allow: /privacy$",
    "Allow: /terms$",
  ]) {
    expect(body).toContain(allow);
  }
  expect(body).toContain("Disallow: /");
  expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});

test("sitemap.xml lista exactamente las cuatro públicas y todas responden 200", async ({
  request,
}) => {
  const response = await request.get(url("/sitemap.xml"));
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/xml");

  const xml = await response.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locs).toEqual(PUBLIC_PAGES.map((page) => page.canonical));

  for (const loc of locs) {
    const page = await request.get(url(new URL(loc ?? "").pathname));
    expect(page.status()).toBe(200);
  }

  for (const privatePath of [
    "/recipes",
    "/ingredients",
    "/produccion",
    "/settings",
    "/sign-in",
  ]) {
    expect(xml).not.toContain(privatePath);
  }
});

test("el 404 responde con status real, título propio y noindex", async ({
  request,
}) => {
  const response = await request.get(url("/ruta-que-no-existe"));
  expect(response.status()).toBe(404);

  const html = await response.text();
  expect(html).toContain("<title>Página no encontrada | KitchCalc</title>");
  expect(metaContent(html, "name", "robots")).toBe("noindex, nofollow");
  expect(canonicalHref(html)).toBeNull();
});

test("la landing navega, alterna tema y precios, y abre el lightbox sin errores", async ({
  page,
  goto,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await goto("/", { waitUntil: "hydration" });

  await expect(page.locator("h1")).toHaveText(
    "Calcula el costo real de tus recetas",
  );
  await expect(page.locator("#features")).toBeAttached();
  await expect(page.locator("#how-it-works")).toBeAttached();

  // El número del paso vive sólo en su cuadrado: el chip del stat no lo repite.
  const steps = await page.locator("#how-it-works").evaluate((section) => ({
    occurrences: ((section.textContent ?? "").match(/01/g) ?? []).length,
    chip: section.querySelector(".font-mono")?.textContent?.trim() ?? "",
  }));
  expect(steps.occurrences, "el paso 01 se imprime una sola vez").toBe(1);
  expect(steps.chip).not.toMatch(/^0\d/);
  expect(steps.chip).toContain("$15.00");

  // Drawer móvil: se anuncia como diálogo, lleva el foco al panel, deja la
  // página inerte y cierra con Escape devolviendo el foco al hamburger.
  await page.setViewportSize({ width: 375, height: 800 });
  const drawer = page.locator("#landing-mobile-menu");
  const panel = page.locator("#landing-mobile-panel");
  const menuButton = page.locator("#landing-mobile-menu-btn");
  const isInert = async (selector: string): Promise<boolean> =>
    await page
      .locator(selector)
      .first()
      .evaluate((el) => (el as HTMLElement).inert);

  await expect(drawer).toHaveAttribute("data-open", "0");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toHaveAttribute(
    "aria-controls",
    "landing-mobile-menu",
  );
  await expect(drawer).toHaveAttribute("role", "dialog");
  await expect(drawer).toHaveAttribute("aria-modal", "true");
  await expect(drawer).toHaveAttribute("aria-label", "Menú");
  // Cerrado: sigue `inert` (nada focusable escondido) y sin bloqueo de scroll.
  expect(await isInert("#landing-mobile-menu")).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  await menuButton.click();
  await expect(drawer).toHaveAttribute("data-open", "1");
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  // El foco entra al panel, no se queda en el hamburger.
  await expect(panel).toBeFocused();
  // Dentro del diálogo el recorrido empieza por el botón de cierre.
  await page.keyboard.press("Tab");
  await expect(page.locator("#landing-mobile-menu-close")).toBeFocused();

  // La página de detrás queda inerte mientras el diálogo está abierto.
  for (const behind of ["#main-content", "footer", "nav"]) {
    expect(await isInert(behind)).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveAttribute("data-open", "0");
  await expect(menuButton).toBeFocused();
  expect(await isInert("#main-content")).toBe(false);
  expect(await isInert("#landing-mobile-menu")).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  await page.setViewportSize({ width: 1280, height: 800 });

  // Tema: el toggle escribe la cookie que el SSR vuelve a leer.
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);
  await page.locator("nav [data-theme-toggle]").first().click();
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/);

  // Precios: el periodo cambia los valores del plan Basic.
  const basicCard = page.locator('#pricing [data-plan="basic"]');
  await basicCard.scrollIntoViewIfNeeded();
  await expect(basicCard).toContainText("$9.99");
  await page
    .locator("#pricing")
    .getByRole("radio", { name: /Anual/ })
    .click();
  await expect(basicCard).toContainText("$7.99");

  // Lightbox: abre con la captura y cierra con Escape.
  const lightbox = page.locator("dialog[data-lightbox]");
  await expect(lightbox).not.toBeVisible();
  await page.locator("[data-lightbox-trigger]").first().click();
  await expect(lightbox).toBeVisible();
  await expect(lightbox.locator("img")).toHaveAttribute(
    "src",
    /receta_(light|dark)\.webp/,
  );
  await page.keyboard.press("Escape");
  await expect(lightbox).not.toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("el hero muestra la captura del producto en los dos temas y los dos anchos", async ({
  page,
  goto,
}) => {
  await goto("/", { waitUntil: "hydration" });

  const shot = page.locator("[data-landing-hero] img");
  // Dimensiones declaradas: la captura entra sin salto de layout.
  await expect(shot).toHaveAttribute("src", "/hero_light.webp");
  await expect(shot).toHaveAttribute("width", "1682");
  await expect(shot).toHaveAttribute("height", "1378");
  await expect(shot).toHaveAttribute("alt", /KitchCalc/);
  // El asset existe y se decodifica (no es un `img` roto).
  expect(
    await shot.evaluate((el) => (el as HTMLImageElement).naturalWidth),
  ).toBe(1682);

  /** Fracción de la captura que cae dentro del primer viewport. */
  const visibleFraction = async (): Promise<number> =>
    await shot.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const visible = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
      return Math.max(visible, 0) / box.height;
    });

  // La prueba entra en el primer viewport en escritorio y en móvil.
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await visibleFraction()).toBe(1);

  await page.setViewportSize({ width: 375, height: 812 });
  expect(await visibleFraction()).toBeGreaterThan(0.5);

  // En móvil la captura va después de los CTA y antes de la tarjeta de costo.
  const order = await page.evaluate(() => {
    const section = document.querySelector("[data-landing-hero]") as HTMLElement;
    const shotEl = section.querySelector("img") as HTMLElement;
    const card = section.querySelector(".min-w-60") as HTMLElement;
    const cta = section.querySelector('a[href="#features"]') as HTMLElement;
    const follows =
      (first: HTMLElement, second: HTMLElement): boolean =>
        (first.compareDocumentPosition(second) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
        0;
    return {
      afterCta: follows(cta, shotEl),
      beforeCostCard: follows(shotEl, card),
    };
  });
  expect(order).toEqual({ afterCta: true, beforeCostCard: true });

  // El tema alterna la captura (mismo patrón que el aserto del lightbox).
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator("nav [data-theme-toggle]").first().click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(shot).toHaveAttribute("src", "/hero_dark.webp");
});

test("el lightbox amplía de verdad y devuelve el foco en ambos estados", async ({
  page,
  goto,
}) => {
  await goto("/", { waitUntil: "hydration" });

  const trigger = page.locator("[data-lightbox-trigger]").first();
  const lightbox = page.locator("dialog[data-lightbox]");
  const image = lightbox.locator("[data-lightbox-img]");
  const stage = lightbox.locator("[data-lightbox-stage]");
  const zoomToggle = lightbox.locator("[data-lightbox-zoom]");
  const closeButton = lightbox.locator("[data-lightbox-close]");

  const renderedWidth = async (): Promise<number> =>
    (await image.boundingBox())?.width ?? 0;

  for (const viewport of [
    { width: 375, height: 800 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(lightbox).toBeVisible();
    await expect(closeButton).toBeFocused();
    // La página de detrás queda bloqueada mientras el diálogo está abierto.
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    const closeBox = await closeButton.boundingBox();
    expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    // Ajuste: la captura entera cabe en el viewport (90vw / 85dvh como máximo).
    const fitWidth = await renderedWidth();
    expect(fitWidth).toBeLessThanOrEqual(viewport.width);
    await expect(stage).toHaveAttribute("data-zoomed", "0");
    const inlineWidth =
      (await page.locator("[data-lightbox-trigger] img").first().boundingBox())
        ?.width ?? 0;

    // El control de zoom es alcanzable con el teclado y mide ≥44px.
    await page.keyboard.press("Tab");
    await expect(zoomToggle).toBeFocused();
    const toggleBox = await zoomToggle.boundingBox();
    expect(toggleBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    // Y responde al ratón: nadie lo tapa y el click llega al botón.
    const isOnTop = await zoomToggle.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        ) === element
      );
    });
    expect(isOnTop, "el control de zoom está por encima del diálogo").toBe(
      true,
    );
    await zoomToggle.click();
    await expect(zoomToggle).toHaveText("Ajustar");
    await expect(stage).toHaveAttribute("data-zoomed", "1");
    const zoomWidth = await renderedWidth();
    expect(zoomWidth).toBeGreaterThan(fitWidth);
    expect(zoomWidth).toBeGreaterThan(viewport.width);
    // El hallazgo era +8% sobre la miniatura: el zoom real la triplica.
    expect(zoomWidth).toBeGreaterThan(inlineWidth * 3);

    // Aterriza en el centro de la captura, no en su esquina vacía.
    const centered = await stage.evaluate((element) => ({
      left: element.scrollLeft,
      center: (element.scrollWidth - element.clientWidth) / 2,
    }));
    expect(centered.left).toBeCloseTo(centered.center, 0);

    // El arrastre con ratón desplaza la captura ampliada.
    const stageBox = await stage.boundingBox();
    const centerX = (stageBox?.x ?? 0) + (stageBox?.width ?? 0) / 2;
    const centerY = (stageBox?.y ?? 0) + (stageBox?.height ?? 0) / 2;
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX - 120, centerY);
    await page.mouse.up();
    expect(
      await stage.evaluate((element) => element.scrollLeft),
    ).toBeGreaterThan(centered.left);

    // Escape cierra ampliado y el foco vuelve al disparador.
    await page.keyboard.press("Escape");
    await expect(lightbox).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

    // Se reabre siempre en ajuste, y Escape también cierra desde ahí.
    await trigger.click();
    await expect(lightbox).toBeVisible();
    await expect(zoomToggle).toHaveText("Ver a tamaño real");
    expect(await renderedWidth()).toBeLessThanOrEqual(viewport.width);
    await page.keyboard.press("Escape");
    await expect(lightbox).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }

  // El doble click sobre la captura también alterna el encuadre. Se pulsa el
  // centro visible del escenario: ampliada, la imagen desborda el contenedor.
  await trigger.click();
  await expect(lightbox).toBeVisible();
  await expect(stage).toHaveAttribute("data-zoomed", "0");
  const doubleClickStage = async (): Promise<void> => {
    const box = await stage.boundingBox();
    await page.mouse.dblclick(
      (box?.x ?? 0) + (box?.width ?? 0) / 2,
      (box?.y ?? 0) + (box?.height ?? 0) / 2,
    );
  };
  await doubleClickStage();
  await expect(zoomToggle).toHaveText("Ajustar");
  await doubleClickStage();
  await expect(zoomToggle).toHaveText("Ver a tamaño real");
  await page.keyboard.press("Escape");
  await expect(lightbox).not.toBeVisible();
});

test("la pista de zoom se descubre con teclado y nombra el puntero real", async ({
  page,
  goto,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await goto("/", { waitUntil: "hydration" });

  const trigger = page.locator("[data-lightbox-trigger]").first();
  const hint = page.locator("#features [data-zoom-hint]").first();

  // En móvil la pista se ve en reposo: no hay hover que la revele.
  await trigger.scrollIntoViewIfNeeded();
  await expect(hint).toHaveCSS("opacity", "1");

  await page.setViewportSize({ width: 1280, height: 800 });
  await trigger.scrollIntoViewIfNeeded();

  // El texto lo decide el puntero, no el ancho de pantalla.
  const finePointer = await page.evaluate(
    () => matchMedia("(pointer: fine)").matches,
  );
  if (finePointer) {
    await expect(hint.locator("[data-zoom-hint-fine]")).toBeVisible();
    await expect(hint.locator("[data-zoom-hint-touch]")).toBeHidden();
  } else {
    await expect(hint.locator("[data-zoom-hint-touch]")).toBeVisible();
    await expect(hint.locator("[data-zoom-hint-fine]")).toBeHidden();
  }

  // En escritorio la pista está en reposo invisible: hasta el foco aparece.
  await expect(hint).toHaveCSS("opacity", "0");

  // El hover también la revela (en el CSS de producción el variante `md:`
  // ganaba siempre y este camino estaba roto).
  await trigger.hover();
  await expect(hint).toHaveCSS("opacity", "1");
  await page.mouse.move(0, 0);
  await expect(hint).toHaveCSS("opacity", "0");

  let reached = false;
  for (let index = 0; index < MAX_TABS && !reached; index += 1) {
    await page.keyboard.press("Tab");
    reached = await trigger.evaluate(
      (element) => element === document.activeElement,
    );
  }
  expect(reached, "el disparador del lightbox se alcanza con Tab").toBe(true);
  await expect(hint).toHaveCSS("opacity", "1");
});

test("con puntero grueso la pista habla de tocar, no de hacer click", async ({
  browser,
}) => {
  // El texto lo decide el puntero; en el contexto por defecto (puntero fino)
  // esta rama no se ejerce nunca.
  const context = await browser.newContext({ hasTouch: true });
  const page = await context.newPage();

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(url("/"), { waitUntil: "networkidle" });
  await page
    .locator("[data-lightbox-trigger]")
    .first()
    .scrollIntoViewIfNeeded();

  const hint = page.locator("#features [data-zoom-hint]").first();
  expect(
    await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
  ).toBe(true);
  await expect(hint.locator("[data-zoom-hint-touch]")).toBeVisible();
  await expect(hint.locator("[data-zoom-hint-fine]")).toBeHidden();

  await context.close();
});

test("con prefers-reduced-motion el drawer cerrado no tapa la página", async ({
  page,
  goto,
}) => {
  // Regresión: el CSS heredado del baseline forzaba `translateX(0)` y el panel
  // quedaba visible con el menú cerrado.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 800 });
  await goto("/", { waitUntil: "hydration" });

  const drawer = page.locator("#landing-mobile-menu");
  await expect(drawer).toHaveAttribute("data-open", "0");
  const closedBox = await page.locator("#landing-mobile-panel").boundingBox();
  expect(closedBox?.x ?? 0).toBeLessThan(0);

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(drawer).toHaveAttribute("data-open", "1");
  const openBox = await page.locator("#landing-mobile-panel").boundingBox();
  expect(openBox?.x ?? -1).toBe(0);
});

test("/pricing anónimo muestra el catálogo y manda a sign-in sin iniciar checkout", async ({
  page,
  goto,
}) => {
  await goto("/pricing", { waitUntil: "hydration" });

  await expect(page.locator("h1")).toHaveText("Planes y precios");

  const paidCtas = page.locator('a:has-text("Suscribirse")');
  await expect(paidCtas).toHaveCount(2);
  for (const href of await paidCtas.evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  )) {
    expect(href).toBe("/sign-in?redirect=/pricing");
  }
  await expect(page.locator('[data-plan="free"] a')).toHaveAttribute(
    "href",
    "/sign-in?redirect=/recipes",
  );
  await expect(page.getByRole("button", { name: "Suscribirse" })).toHaveCount(0);

  await goto("/pricing?canceled=1", { waitUntil: "hydration" });
  await expect(page.getByText("Suscripción cancelada")).toBeVisible();
});

test("la card de plan se ve igual en la landing y en /pricing", async ({
  page,
  goto,
}) => {
  /** Borde, fondo y radio del mismo plan en la superficie que esté cargada. */
  const cardStyles = async (): Promise<Record<string, string | null>[]> =>
    await page.locator("[data-plan]").evaluateAll((cards) =>
      cards.map((card) => {
        const style = getComputedStyle(card);
        return {
          plan: card.getAttribute("data-plan"),
          border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
          background: style.backgroundColor,
          radius: style.borderTopLeftRadius,
        };
      }),
    );

  for (const theme of ["light", "dark"] as const) {
    await page
      .context()
      .addCookies([{ name: "kitchcalc-theme", value: theme, url: url("/") }]);

    await goto("/", { waitUntil: "hydration" });
    const landing = await cardStyles();

    await goto("/pricing", { waitUntil: "hydration" });
    const pricing = await cardStyles();

    expect(
      landing.map((card) => card.plan),
      `planes renderizados en ${theme}`,
    ).toEqual(["pro", "free", "basic"]);
    expect(pricing, `la card en ${theme} depende de la superficie`).toEqual(
      landing,
    );
  }
});

test("la landing abre por el recomendado y manda el catálogo completo a /pricing", async ({
  page,
  goto,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await goto("/", { waitUntil: "hydration" });

  const scroller = page.locator("#pricing .pricing-scroll");
  const recommended = scroller.locator("[data-plan]").first();

  // El scroller arranca en 0 y el recomendado cae entero en el viewport: ya no
  // queda a dos swipes como cuando cerraba la fila.
  await expect(recommended).toHaveAttribute("data-plan", "pro");
  expect(await scroller.evaluate((element) => element.scrollLeft)).toBe(0);
  const box = await recommended.boundingBox();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);

  // Destacados: lo que se gana con cada plan, sin filas "no incluido".
  const pro = page.locator('#pricing [data-plan="pro"]');
  await expect(pro).toContainText("Recetas ilimitadas");
  await expect(pro).not.toContainText("Costeo básico con márgenes");
  await expect(page.locator('#pricing [data-plan="free"]')).not.toContainText(
    "Duplicar recetas",
  );
  await expect(page.locator('#pricing [data-plan="basic"]')).toContainText(
    "Planificador de producción",
  );
  await expect(page.locator("#pricing")).not.toContainText("No incluido");

  // El catálogo completo está a un click, una vez por card.
  const details = page.locator('#pricing a[href="/pricing"]');
  await expect(details).toHaveCount(3);
  await expect(details.first()).toContainText("Ver todas las funciones");
  await details.first().click();
  await expect(page).toHaveURL(/\/pricing$/);
});

test("/pricing compara sólo las diferencias y no repite lo igual en los tres planes", async ({
  page,
  goto,
}) => {
  await goto("/pricing", { waitUntil: "hydration" });

  const comparison = page.locator("section:has(#plan-comparison-heading)");
  const table = comparison.locator("table");

  // Columnas = cards, en el mismo orden (el recomendado primero).
  await expect(table.locator("thead th")).toHaveText(["Pro", "Free", "Basic"]);
  // Cinco slots cambian entre planes y nueve son iguales en los tres.
  await expect(table.locator("tbody tr")).toHaveCount(5);
  await expect(comparison.locator("li")).toHaveCount(9);
  await expect(table.getByText("Costeo básico con márgenes")).toHaveCount(0);
  await expect(
    comparison.locator("li", { hasText: "Costeo básico con márgenes" }),
  ).toHaveCount(1);
  await expect(comparison.locator("li", { hasText: "Exportar a PDF" })).toHaveCount(
    1,
  );

  // Cada celda dice el estado de su plan: el mismo texto cambia de estado.
  const duplicates = table.locator("tbody tr", { hasText: "Duplicar recetas" });
  await expect(duplicates).toHaveCount(1);
  expect(
    await duplicates
      .locator(".sr-only")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "")),
  ).toEqual(["Incluido:", "No incluido:", "Incluido:"]);

  // Las cards llevan precio, CTA y estados; el catálogo vive en la comparación.
  await expect(page.locator('[data-plan="free"]')).toContainText("Gratis");
  await expect(page.locator('[data-plan="free"]')).not.toContainText(
    "Hasta 10 recetas",
  );

  // A 320px la tabla no esconde filas ni desborda la página: las celdas se
  // envuelven en sus tres columnas.
  await page.setViewportSize({ width: 320, height: 800 });
  await goto("/pricing", { waitUntil: "hydration" });
  await expect(table.locator("tbody tr").first()).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("/pricing autenticado respeta el plan actual y completa el checkout", async ({
  page,
  context,
  goto,
}) => {
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: "stub-session-token",
      url: url("/"),
    },
  ]);

  await goto("/pricing", { waitUntil: "hydration" });

  // El stub responde plan Pro: sólo ese plan queda como actual.
  await expect(page.locator('[data-plan="pro"] button')).toHaveText("Plan actual");
  await expect(page.locator('[data-plan="pro"] button')).toBeDisabled();

  // La comparación marca la columna del plan del visitante.
  await expect(
    page.locator("section:has(#plan-comparison-heading) thead th"),
  ).toHaveText(["Pro Plan actual", "Free", "Basic"]);

  await page.locator('[data-plan="basic"] button').click();

  // El stub exige `x-csrf-token` y devuelve el `successUrl` que mandó el
  // cliente: el flujo real aterriza en el tab de facturación de Settings.
  await expect(page).toHaveURL(/\/settings\?tab=billing&success=1/);
  await expect(page.getByText("Pago exitoso")).toBeVisible();
});
