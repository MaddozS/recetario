import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";

const SITE_URL = "https://app.kitchcalc.com";

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
  await page.locator("#features button").first().click();
  await expect(lightbox).toBeVisible();
  await expect(lightbox.locator("img")).toHaveAttribute(
    "src",
    /receta_(light|dark)\.webp/,
  );
  await page.keyboard.press("Escape");
  await expect(lightbox).not.toBeVisible();

  expect(consoleErrors).toEqual([]);
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
    ).toEqual(["free", "basic", "pro"]);
    expect(pricing, `la card en ${theme} depende de la superficie`).toEqual(
      landing,
    );
  }
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

  await page.locator('[data-plan="basic"] button').click();

  // El stub exige `x-csrf-token` y devuelve el `successUrl` que mandó el
  // cliente: el flujo real aterriza en el tab de facturación de Settings.
  await expect(page).toHaveURL(/\/settings\?tab=billing&success=1/);
  await expect(page.getByText("Pago exitoso")).toBeVisible();
});
