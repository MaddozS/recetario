import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";

/**
 * Bootstrap de sesión y shell autenticado contra el stub del API: verifica el
 * HTML SSR real (sin depender de hidratación) y el comportamiento del drawer,
 * bottom nav, logout y redirects.
 */

const SESSION_COOKIE = "better-auth.session_token=stub-session-token";
const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

test("anónimo: la ruta privada redirige a sign-in con destino y motivo", async ({
  request,
}) => {
  const response = await request.get(url("/recipes?category=pan"), {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(302);
  const location = new URL(response.headers().location ?? "", url("/"));
  expect(location.pathname).toBe("/sign-in");
  expect(location.searchParams.get("reason")).toBe("auth_required");
  expect(location.searchParams.get("redirect")).toBe("/recipes?category=pan");
});

test("autenticado: SSR del shell con tema, cookies y cabeceras privadas", async ({
  request,
}) => {
  const response = await request.get(url("/recipes"), {
    headers: { cookie: SESSION_COOKIE },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  // Las tres cookies viajan en la misma respuesta: preferencias + CSRF.
  const setCookies = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => header.value);
  expect(setCookies.filter((value) => value.startsWith("kitchcalc-"))).toHaveLength(2);
  expect(setCookies.some((value) => value.startsWith("kitchcalc-theme=dark"))).toBe(true);
  expect(setCookies.some((value) => value.startsWith("kitchcalc-accent=emerald"))).toBe(true);
  // El token dura lo que la sesión (7 días) y es legible por JS (doble-submit).
  const csrfCookie = setCookies.find((value) => value.startsWith("csrf_token="));
  expect(csrfCookie).toBeDefined();
  expect(csrfCookie).toContain("Max-Age=604800");
  expect(csrfCookie).toContain("SameSite=Strict");
  expect(csrfCookie).not.toContain("HttpOnly");

  const html = await response.text();
  expect(html).toMatch(/<html[^>]*data-theme="dark"/);
  expect(html).toMatch(/<html[^>]*data-accent="emerald"/);
  expect(html).toMatch(/<html[^>]*class="dark"/);
  expect(html).toContain("--aw-accent-600:");
  expect(html).toContain("--color-accent-600:");
  expect(html).toContain('id="app-sidebar"');
  expect(html).toContain('id="sign-out-button"');
  expect(html).toContain('id="bottom-nav"');
  expect(html).toContain('name="robots" content="noindex, nofollow"');
  expect(html).toContain("Producción");
  expect(html).toContain("Recetas");
});

test("anónimo: las rutas públicas siguen respondiendo y sin shell", async ({
  request,
}) => {
  const response = await request.get(url("/pricing"));

  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).not.toContain('id="app-sidebar"');
  // La barra de progreso vive en `app.vue`: está en todos los layouts.
  expect(html).toContain('id="nav-progress-bar"');
});

test("plan free: el shell oculta Producción y mantiene las tres secciones", async ({
  request,
}) => {
  const response = await request.get(url("/recipes"), {
    headers: { cookie: `${SESSION_COOKIE}; qa-plan=free` },
  });

  const html = await response.text();
  expect(html).toContain('id="bottom-nav"');
  expect(html).not.toContain("Producción");
  // Sin la feature, el bottom nav usa tres columnas.
  expect(html).toContain("grid-cols-3");
});

test("preferencias cookie-first: la cookie gana sobre la sesión", async ({
  request,
}) => {
  const response = await request.get(url("/recipes"), {
    headers: {
      cookie: `${SESSION_COOKIE}; kitchcalc-theme=light; kitchcalc-accent=coral`,
    },
  });

  const html = await response.text();
  expect(html).toMatch(/<html[^>]*data-theme="light"/);
  expect(html).toMatch(/<html[^>]*data-accent="coral"/);
  expect(html).not.toMatch(/<html[^>]*class="dark"/);
});

test("móvil: drawer, overlay y bottom nav declarativos", async ({ page, goto }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.context().addCookies([
    { name: "better-auth.session_token", value: "stub-session-token", url: url("/") },
  ]);
  await page.setViewportSize(MOBILE);
  await goto("/recipes");

  const sidebar = page.locator("#app-sidebar");
  const overlay = page.locator("#mobile-sidebar-overlay");
  expect(await sidebar.getAttribute("class")).toContain("-translate-x-full");
  expect(await overlay.getAttribute("class")).toContain("opacity-0");
  await expect(page.locator("#bottom-nav")).toBeVisible();
  await expect(page.locator("#sidebar-nav")).toContainText("Ingredientes");

  await page.getByRole("button", { name: "Abrir menú" }).click();
  expect(await sidebar.getAttribute("class")).toContain("translate-x-0");
  expect(await overlay.getAttribute("class")).toContain("opacity-100");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  await page.keyboard.press("Escape");
  expect(await sidebar.getAttribute("class")).toContain("-translate-x-full");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  // La cookie CSRF debe ser legible por JS (doble-submit).
  expect(await page.evaluate(() => document.cookie)).toContain("csrf_token=");

  await expect(page.locator('nav[data-variant="mobile"]')).toContainText("Recetas");
  expect(consoleErrors).toEqual([]);
});

test("escritorio: sidebar fija, sin bottom nav y breadcrumb del shell", async ({
  page,
  goto,
}) => {
  await page.context().addCookies([
    { name: "better-auth.session_token", value: "stub-session-token", url: url("/") },
  ]);
  await page.setViewportSize(DESKTOP);
  // `/settings/billing` es un 301 desde Task 11: la ruta viva es la query.
  await goto("/settings?tab=billing");

  await expect(page.locator("#bottom-nav")).toBeHidden();
  expect(await page.locator("#app-sidebar").getAttribute("class")).toContain("md:static");
  await expect(page.locator('nav[data-variant="desktop"]')).toContainText("Configuración");
  await expect(page.locator('nav[data-variant="mobile"]')).toContainText("Configuración");
  await expect(page.locator("#sign-out-button")).toContainText("Cerrar sesión");
});

test("el colapso de la sidebar se persiste y se lee en SSR", async ({
  page,
  goto,
}) => {
  await page.context().addCookies([
    { name: "better-auth.session_token", value: "stub-session-token", url: url("/") },
    { name: "kitchcalc-sidebar-collapsed", value: "1", url: url("/") },
  ]);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  const sidebar = page.locator("#app-sidebar");
  expect(await sidebar.getAttribute("data-collapsed")).toBe("1");
  expect(await sidebar.getAttribute("class")).toContain("md:w-16");

  await page.locator("#sidebar-collapse-toggle").click();
;
  expect(await sidebar.getAttribute("data-collapsed")).toBe("0");
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === "kitchcalc-sidebar-collapsed")?.value).toBe("0");
});

test("sign-in establece la sesión y el shell aparece", async ({ page, goto }) => {
  await page.setViewportSize(DESKTOP);
  await goto("/sign-in");

  await page.evaluate(async () => {
    await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "qa@example.com", password: "Temporal123!" }),
    });
  });

  await goto("/recipes");
  await expect(page.locator("#sign-out-button")).toBeVisible();
  await expect(page.locator("#sidebar-nav")).toContainText("Recetas");
});

test("logout limpia la cookie y una ruta privada vuelve a pedir sesión", async ({
  page,
  goto,
}) => {
  await page.context().addCookies([
    { name: "better-auth.session_token", value: "stub-session-token", url: url("/") },
  ]);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  await page.locator("#sign-out-button").click();
  await page.waitForURL(/\/sign-in/);

  const cookies = await page.context().cookies();
  expect(
    cookies.some(
      (cookie) =>
        cookie.name === "better-auth.session_token" &&
        cookie.value === "stub-session-token",
    ),
  ).toBe(false);

  await goto("/recipes");
  await page.waitForURL(/\/sign-in\?.*reason=auth_required/);
});
