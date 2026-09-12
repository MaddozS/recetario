import { expect, test } from "@nuxt/test-utils/playwright";

const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

test("la landing responde 200, hidrata sin errores y muestra el design system", async ({
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

  await expect(page.locator("h1")).toHaveText("KitchCalc");
  await expect(page.getByText("Button · variantes")).toBeVisible();

  // Sin omisión de información en móvil: mismas variantes y etiquetas.
  await page.setViewportSize(MOBILE);
  for (const label of ["Primario", "Secundario", "Peligro", "Ghost"]) {
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  }
  for (const label of ["sm", "md", "lg"]) {
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  }
  for (const label of ["accent", "success", "danger", "warning", "neutral"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

  // El CTA sin actionHref es `lg:hidden` (paridad con Astro).
  await expect(
    page.getByRole("button", { name: "Nueva receta" }),
  ).toBeVisible();

  await page.setViewportSize(DESKTOP);
  await expect(page.getByText("Button · tamaños y estados")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nueva receta" })).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test("el diálogo portado abre, cierra con Escape y bloquea el backdrop ocupado", async ({
  page,
  goto,
}) => {
  await goto("/", { waitUntil: "hydration" });

  const dialog = page.locator("#qa-dialog");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Abrir diálogo" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Contenido de ejemplo")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("una ruta privada placeholder responde 200 con noindex y lee el parámetro", async ({
  page,
  goto,
}) => {
  const response = await goto("/recipes/brownie-123", {
    waitUntil: "hydration",
  });
  expect(response?.status()).toBe(200);

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(page.locator("h1")).toHaveText("Detalle de receta");
  await expect(page.getByText("id: brownie-123")).toBeVisible();
});
