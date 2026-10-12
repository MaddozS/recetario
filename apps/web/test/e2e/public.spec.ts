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
    path: "/funciones",
    title: "Funciones | KitchCalc",
    description:
      "Qué hace cada módulo de KitchCalc: costeo de recetas, ingredientes y precios de compra, planificador de producción, costos fijos y márgenes. Con capturas reales del producto.",
    canonical: `${SITE_URL}/funciones`,
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
    "Allow: /funciones$",
    "Allow: /pricing$",
    "Allow: /privacy$",
    "Allow: /terms$",
  ]) {
    expect(body).toContain(allow);
  }
  expect(body).toContain("Disallow: /");
  expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});

test("sitemap.xml lista exactamente las cinco públicas y todas responden 200", async ({
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

test("la landing navega, mantiene el modo claro y precios, y abre el lightbox sin errores", async ({
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
  await expect(page.locator("#problem")).toBeAttached();
  await expect(page.locator("#features")).toBeAttached();
  await expect(page.locator("#how-it-works")).toBeAttached();
  await expect(page.locator("#contact")).toBeAttached();

  // Cómo funciona: los tres pasos se numeran una sola vez...
  const numbering = await page.locator("#how-it-works").evaluate((section) => {
    const text = section.textContent ?? "";
    return ["01", "02", "03"].map(
      (step) => (text.match(new RegExp(step, "g")) ?? []).length,
    );
  });
  expect(numbering, "cada paso se imprime una sola vez").toEqual([1, 1, 1]);

  // ...y la cuenta que muestran cuadra con la fórmula del producto
  // (`precio = costo / (1 - margen)`): es la promesa de "muestra la cuenta".
  const receipt = page.locator("#how-it-works [data-cost-receipt]");
  const figures = await receipt.evaluate((node) =>
    [...(node.textContent ?? "").matchAll(/\$([\d.]+)/g)].map((match) =>
      Number(match[1]),
    ),
  );
  expect(figures, "insumos, operativos, total, precio y ganancia").toHaveLength(
    5,
  );
  expect(figures[0]! + figures[1]!).toBeCloseTo(figures[2]!, 2);
  expect(figures[2]! / (1 - 0.4)).toBeCloseTo(figures[3]!, 2);
  expect(figures[3]! - figures[2]!).toBeCloseTo(figures[4]!, 2);

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

  // Tema: la landing no ofrece modo oscuro (el toggle vive sólo en el login) y
  // la cookie de tema no la oscurece: el marketing se fuerza claro.
  const html = page.locator("html");
  await expect(page.locator("nav [data-theme-toggle]")).toHaveCount(0);
  await expect(html).not.toHaveClass(/dark/);
  await expect(html).toHaveAttribute("data-theme", "light");

  await page
    .context()
    .addCookies([{ name: "kitchcalc-theme", value: "dark", url: url("/") }]);
  await goto("/", { waitUntil: "hydration" });
  await expect(html).not.toHaveClass(/dark/);
  await expect(html).toHaveAttribute("data-theme", "light");

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

test("el hero muestra la captura del producto en los dos anchos y sólo en claro", async ({
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

  // La captura ya no tiene variante oscura (y el marketing tampoco): aun con la
  // cookie de tema en dark, el hero sigue en claro y con el mismo asset.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .context()
    .addCookies([{ name: "kitchcalc-theme", value: "dark", url: url("/") }]);
  await goto("/", { waitUntil: "hydration" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(shot).toHaveAttribute("src", "/hero_light.webp");
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

  // Una sola pasada: las dos superficies son públicas y el marketing se fuerza
  // claro, así que el recorrido por tema medía dos veces el mismo documento.
  await goto("/", { waitUntil: "hydration" });
  const landing = await cardStyles();

  await goto("/pricing", { waitUntil: "hydration" });
  const pricing = await cardStyles();

  expect(landing.map((card) => card.plan), "planes renderizados").toEqual([
    "pro",
    "free",
    "basic",
  ]);
  expect(pricing, "la card depende de la superficie").toEqual(landing);
});

test("/funciones explica cada módulo, marca su enlace y reusa el lightbox", async ({
  page,
  goto,
}) => {
  await goto("/funciones", { waitUntil: "hydration" });

  await expect(page.locator("h1")).toHaveText(
    "Qué hace KitchCalc, módulo por módulo",
  );
  for (const title of [
    "Recetas y costeo",
    "Ingredientes y precios de compra",
    "Planificador de producción",
  ]) {
    await expect(
      page.getByRole("heading", { level: 2, name: title }),
    ).toBeVisible();
  }

  // El nav es el índice del sitio: "Funciones" marca la ruta, no una ancla del
  // landing (por eso el enlace activo se resuelve por ruta).
  await expect(page.locator("nav a[aria-current='page']").first()).toHaveText(
    "Funciones",
  );

  // Las capturas reales abren el mismo lightbox que en la landing.
  const lightbox = page.locator("dialog[data-lightbox]");
  await expect(lightbox).not.toBeVisible();
  await page.locator("[data-lightbox-trigger]").first().click();
  await expect(lightbox).toBeVisible();
  await expect(lightbox.locator("img")).toHaveAttribute(
    "src",
    "/receta_light.webp",
  );
  await page.keyboard.press("Escape");
  await expect(lightbox).not.toBeVisible();

  // Cierra con la banda CTA común a todas las públicas.
  await expect(page.locator("#cta")).toBeAttached();

  // Y su "Ver planes" apunta a la página: el ancla `#pricing` sólo resuelve en
  // la home, así que aquí sería un enlace muerto.
  await expect(page.locator('#cta a:has-text("Ver planes")')).toHaveAttribute(
    "href",
    "/pricing",
  );
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

test("/pricing compara todas las funciones en una sola matriz", async ({
  page,
  goto,
}) => {
  await goto("/pricing", { waitUntil: "hydration" });

  const comparison = page.locator(
    "section[aria-labelledby='plan-comparison-heading']",
  );
  const table = comparison.locator("table");
  const rows = table.locator("tbody tr");

  /** Fila de la matriz por el nombre exacto de su función. */
  const matrixRow = (label: string) =>
    rows.filter({
      has: page.locator("th[scope='row']", { hasText: new RegExp(`^${label}$`) }),
    });

  // Una sola tabla: la columna de función y una columna por plan, en el mismo
  // orden que las cards (el recomendado primero).
  await expect(table.locator("thead th")).toHaveText([
    "Función",
    "Pro",
    "Free",
    "Basic",
  ]);
  // El catálogo completo, en su orden: también lo que comparten los tres planes.
  await expect(rows).toHaveCount(14);
  await expect(rows.locator("th[scope='row']")).toHaveText([
    "Recetas",
    "Ingredientes",
    "Costeo básico con márgenes",
    "Categorías",
    "Instrucciones de preparación",
    "Duplicar recetas",
    "Fotos de recetas",
    "Stock de ingredientes",
    "Planificador de producción",
    "Exportar a PDF",
    "Costos fijos avanzados",
    "Historial de cambios",
    "Importar/Exportar datos",
    "Información nutricional",
  ]);
  // Nada queda fuera de la matriz: ni listas ni bloques aparte.
  await expect(comparison.locator("li")).toHaveCount(0);
  await expect(comparison).not.toContainText("Igual en todos los planes");
  await expect(comparison).not.toContainText("Lo que cambia");

  // Los límites llevan la frase propia de cada plan, no la etiqueta repetida.
  const limits = matrixRow("Recetas");
  await expect(limits.locator("td").nth(0)).toHaveText(/Recetas ilimitadas/);
  await expect(limits.locator("td").nth(1)).toHaveText(/Hasta 10 recetas/);
  await expect(limits.locator("td").nth(2)).toHaveText(/Hasta 75 recetas/);

  // Lo que comparten los tres planes tiene su fila con las tres marcas.
  await expect(matrixRow("Costeo básico con márgenes").locator("td")).toHaveText([
    "Incluido:",
    "Incluido:",
    "Incluido:",
  ]);

  // Cada celda dice el estado de su plan: el mismo texto cambia de estado.
  const duplicates = matrixRow("Duplicar recetas");
  await expect(duplicates).toHaveCount(1);
  expect(
    await duplicates
      .locator(".sr-only")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "")),
  ).toEqual(["Incluido:", "No incluido:", "Incluido:"]);

  // Las filas próximas dicen la inclusión futura por columna (Free y Basic no
  // la tendrán, Pro sí) y el aviso se lee en texto.
  const pdf = matrixRow("Exportar a PDF");
  expect(
    await pdf
      .locator(".sr-only")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "")),
  ).toEqual([
    "Incluido, próximamente:",
    "No incluido, próximamente:",
    "No incluido, próximamente:",
  ]);
  await expect(pdf.locator("td span[aria-hidden='true']")).toHaveText([
    "Próximamente",
    "Próximamente",
    "Próximamente",
  ]);

  // El valor propio del plan convive con el aviso de lo que falta por llegar.
  await expect(matrixRow("Fotos de recetas").locator("td").nth(2)).toHaveText(
    /Fotos de recetas \(1 por receta\) · Próximamente/,
  );

  // Las cards llevan precio, CTA y estados; el catálogo vive en la comparación.
  await expect(page.locator('[data-plan="free"]')).toContainText("Gratis");
  await expect(page.locator('[data-plan="free"]')).not.toContainText(
    "Hasta 10 recetas",
  );

  // A 320px la matriz no esconde filas ni columnas, y no desborda la página.
  await page.setViewportSize({ width: 320, height: 800 });
  await goto("/pricing", { waitUntil: "hydration" });
  await expect(table.locator("thead th")).toHaveCount(4);
  const firstRow = table.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  await expect(firstRow.locator("td").nth(2)).toBeVisible();
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
    page.locator(
      "section[aria-labelledby='plan-comparison-heading'] thead th",
    ),
  ).toHaveText(["Función", "Pro Plan actual", "Free", "Basic"]);

  await page.locator('[data-plan="basic"] button').click();

  // El stub exige `x-csrf-token` y devuelve el `successUrl` que mandó el
  // cliente: el flujo real aterriza en el tab de facturación de Settings.
  await expect(page).toHaveURL(/\/settings\?tab=billing&success=1/);
  await expect(page.getByText("Pago exitoso")).toBeVisible();
});
