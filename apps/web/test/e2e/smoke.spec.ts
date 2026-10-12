import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";

const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

test("la landing responde 200, hidrata sin errores y muestra sus secciones", async ({
  page,
  goto,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const response = await goto("/", { waitUntil: "hydration" });
  expect(response?.status()).toBe(200);

  await expect(page.locator("h1")).toHaveText(
    "Calcula el costo real de tus recetas",
  );

  // Paridad móvil/desktop: la navegación cambia de forma, no de información.
  await page.setViewportSize(MOBILE);
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  await expect(page.locator("#features").getByRole("heading", { level: 2 })).toHaveText(
    "Cada número, trazable",
  );

  await page.setViewportSize(DESKTOP);
  await expect(page.locator("nav").getByRole("link", { name: "Precios" })).toBeVisible();
  await expect(page.locator("#how-it-works").getByRole("heading", { level: 2 })).toHaveText(
    "Del ingrediente al precio final",
  );
  await expect(page.locator("#pricing").getByRole("heading", { level: 2 })).toHaveText(
    "Planes y precios",
  );

  // El CTA del navbar distingue sesión (anónimo → sign-in).
  await expect(page.locator("nav").getByRole("link", { name: "Comenzar gratis" })).toHaveAttribute(
    "href",
    "/sign-in",
  );

  expect(consoleErrors).toEqual([]);
});

test("una ruta privada sin sesión redirige a sign-in antes de renderizar", async ({
  request,
}) => {
  // Task 4 conectó el shell privado: el SSR corta con un 302 explicado en vez
  // de renderizar el placeholder (el caso autenticado vive en shell.spec.ts).
  const response = await request.get(url("/recipes/brownie-123"), {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(302);
  const location = new URL(response.headers().location ?? "", url("/"));
  expect(location.pathname).toBe("/sign-in");
  expect(location.searchParams.get("redirect")).toBe("/recipes/brownie-123");
  expect(location.searchParams.get("reason")).toBe("auth_required");
});
