import { describe, expect, it } from "vitest";
import {
  APP_NAV_ITEMS,
  breadcrumbsWithTail,
  pageKeyFromPath,
  visibleNavItems,
} from "../../shared/utils/navigation";

describe("pageKeyFromPath", () => {
  it("mapea cada sección privada y sus subrutas", () => {
    expect(pageKeyFromPath("/recipes")).toBe("recipes");
    expect(pageKeyFromPath("/recipes/123")).toBe("recipes");
    expect(pageKeyFromPath("/recipes/123?edit=true")).toBe("recipes");
    expect(pageKeyFromPath("/ingredients")).toBe("ingredients");
    expect(pageKeyFromPath("/produccion")).toBe("production");
    expect(pageKeyFromPath("/settings")).toBe("settings");
    expect(pageKeyFromPath("/settings/billing")).toBe("settings");
  });

  it("devuelve null fuera del shell privado", () => {
    expect(pageKeyFromPath("/")).toBeNull();
    expect(pageKeyFromPath("/sign-in")).toBeNull();
    expect(pageKeyFromPath("/pricing")).toBeNull();
    expect(pageKeyFromPath("/recipe")).toBeNull();
  });
});

describe("breadcrumbsWithTail", () => {
  const base = [{ label: "Recetas", href: "/recipes" }, { label: "Receta" }];

  it("reemplaza la última miga con la etiqueta dinámica de la ruta", () => {
    expect(
      breadcrumbsWithTail(
        base,
        { path: "/recipes/4", label: "Pan de prueba" },
        "/recipes/4",
      ),
    ).toEqual([
      { label: "Recetas", href: "/recipes" },
      { label: "Pan de prueba" },
    ]);
  });

  it("ignora la etiqueta si es de otra ruta (navegación posterior)", () => {
    expect(
      breadcrumbsWithTail(
        base,
        { path: "/recipes/4", label: "Pan de prueba" },
        "/recipes",
      ),
    ).toEqual(base);
  });

  it("sin etiqueta o en blanco conserva el fallback estático", () => {
    expect(breadcrumbsWithTail(base, null, "/recipes/4")).toEqual(base);
    expect(
      breadcrumbsWithTail(
        base,
        { path: "/recipes/4", label: "   " },
        "/recipes/4",
      ),
    ).toEqual(base);
  });

  it("sin migas base usa la etiqueta como única miga", () => {
    expect(
      breadcrumbsWithTail(
        [],
        { path: "/recipes/4", label: "Pan de prueba" },
        "/recipes/4",
      ),
    ).toEqual([{ label: "Pan de prueba" }]);
  });
});

describe("visibleNavItems", () => {
  it("declara las cuatro secciones con sus rutas e íconos", () => {
    expect(APP_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/recipes",
      "/ingredients",
      "/produccion",
      "/settings",
    ]);
    for (const item of APP_NAV_ITEMS) {
      expect(item.icon).toMatch(/^lucide:/);
    }
  });

  it("oculta Producción sin la feature del plan", () => {
    expect(visibleNavItems(false).map((item) => item.page)).toEqual([
      "recipes",
      "ingredients",
      "settings",
    ]);
    expect(visibleNavItems(true).map((item) => item.page)).toEqual([
      "recipes",
      "ingredients",
      "production",
      "settings",
    ]);
  });
});
