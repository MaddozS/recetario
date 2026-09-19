import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { computed } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Badge from "~/components/ui/atoms/Badge.vue";
import SignOutButton from "~/components/ui/molecules/SignOutButton.vue";
import AppBottomNav from "~/components/ui/organisms/AppBottomNav.vue";
import AppHeader from "~/components/ui/organisms/AppHeader.vue";
import AppSidebar from "~/components/ui/organisms/AppSidebar.vue";
import AppBreadcrumbs from "~/components/ui/molecules/AppBreadcrumbs.vue";

const authMock = vi.hoisted(() => ({
  isAuthenticated: true,
  tier: "pro",
  hasFeature: vi.fn((): boolean => true),
}));

const apiMock = vi.hoisted(() => ({
  request: vi.fn(async (): Promise<unknown> => ({ ok: true })),
}));

const navigateMock = vi.hoisted(() => vi.fn(async (): Promise<void> => {}));

/** Destino de la navegación en curso; lo escribe el plugin `nav-pending`. */
const navPendingMock = vi.hoisted(() => ({ path: null as string | null }));

mockNuxtImport("useNavPending", () => () => ({
  value: navPendingMock.path,
}));

mockNuxtImport("useAuth", () => () => ({
  state: { value: { status: "authenticated" } },
  isAuthenticated: computed(() => authMock.isAuthenticated),
  user: computed(() => ({ id: "user-1", name: "QA Prueba" })),
  subscription: computed(() => ({ tier: authMock.tier })),
  preferences: computed(() => ({ theme: "system", accentColor: "coral" })),
  hasFeature: authMock.hasFeature,
  expire: () => {},
}));

mockNuxtImport("useApi", () => () => apiMock.request);
mockNuxtImport("navigateTo", () => navigateMock);

beforeEach(() => {
  authMock.isAuthenticated = true;
  authMock.tier = "pro";
  authMock.hasFeature = vi.fn((): boolean => true);
  navPendingMock.path = null;
  apiMock.request.mockClear();
  navigateMock.mockClear();
});

describe("AppSidebar", () => {
  it("lista las cuatro secciones y marca la activa", async () => {
    const wrapper = await mountSuspended(AppSidebar, {
      props: { currentPage: "ingredients" },
    });

    const links = wrapper.findAll("nav a");
    expect(links.map((link) => link.text())).toEqual([
      "Recetas",
      "Ingredientes",
      "Producción",
      "Configuración",
    ]);

    const active = wrapper.find('a[aria-current="page"]');
    expect(active.text()).toBe("Ingredientes");
    expect(active.classes()).toContain("bg-accent-solid");
    expect(active.classes()).toContain("text-text-on-accent");
  });

  it("oculta Producción sin la feature del plan", async () => {
    authMock.hasFeature = vi.fn((): boolean => false);

    const wrapper = await mountSuspended(AppSidebar, {
      props: { currentPage: "recipes" },
    });

    expect(wrapper.findAll("nav a")).toHaveLength(3);
    expect(wrapper.text()).not.toContain("Producción");
  });

  it("etiqueta el plan en la cabecera móvil y en el footer de escritorio", async () => {
    const pro = await mountSuspended(AppSidebar, {
      props: { currentPage: "recipes" },
    });
    expect(pro.findAllComponents(Badge).map((badge) => badge.text())).toEqual([
      "Pro",
      "Pro",
    ]);

    authMock.tier = "free";
    const free = await mountSuspended(AppSidebar, {
      props: { currentPage: "recipes" },
    });
    expect(free.findAllComponents(Badge).map((badge) => badge.text())).toEqual([
      "Free",
      "Free",
    ]);
  });

  it("muestra la marca sin subtítulo en la cabecera móvil anónima", async () => {
    authMock.isAuthenticated = false;

    const wrapper = await mountSuspended(AppSidebar, {
      props: { currentPage: "recipes" },
    });

    expect(wrapper.text()).toContain("KitchCalc");
    expect(wrapper.text()).not.toContain("Costeo Inteligente");
  });

  it("colapsa las etiquetas y emite los eventos", async () => {
    const onClose = vi.fn();
    const onToggleCollapse = vi.fn();

    const wrapper = await mountSuspended(AppSidebar, {
      props: { currentPage: "recipes", collapsed: true },
      attrs: { onClose, onToggleCollapse },
    });

    expect(wrapper.find(".sidebar-label").classes()).toContain("md:opacity-0");

    await wrapper.find("#close-sidebar-btn").trigger("click");
    await wrapper.find("#sidebar-collapse-toggle").trigger("click");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("marca el destino pendiente sin pisar la sección activa", async () => {
    navPendingMock.path = "/ingredients";

    const wrapper = await mountSuspended(AppSidebar, {
      props: { currentPage: "recipes" },
    });

    const pending = wrapper.find('a[data-pending="1"]');
    expect(pending.text()).toBe("Ingredientes");
    expect(pending.classes()).toContain("opacity-70");
    expect(pending.attributes("aria-current")).toBeUndefined();

    const active = wrapper.find('a[aria-current="page"]');
    expect(active.text()).toBe("Recetas");
    expect(active.attributes("data-pending")).toBeUndefined();
  });

  it("coincide con la sección en sus subrutas (query y detalle)", async () => {
    navPendingMock.path = "/recipes/4?edit=true";

    const wrapper = await mountSuspended(AppSidebar, {
      props: { currentPage: "ingredients" },
    });

    expect(wrapper.find('a[data-pending="1"]').text()).toBe("Recetas");
  });
});

describe("AppBottomNav", () => {
  it("usa tres columnas sin la feature de producción", async () => {
    const wrapper = await mountSuspended(AppBottomNav, {
      props: { currentPage: "recipes", showProduction: false },
    });

    expect(wrapper.findAll("a")).toHaveLength(3);
    expect(wrapper.find("div").classes()).toContain("grid-cols-3");
  });

  it("usa cuatro columnas con producción y marca la activa", async () => {
    const wrapper = await mountSuspended(AppBottomNav, {
      props: { currentPage: "production", showProduction: true },
    });

    const links = wrapper.findAll("a");
    expect(links).toHaveLength(4);
    expect(wrapper.find("div").classes()).toContain("grid-cols-4");

    const active = wrapper.find('a[aria-current="page"]');
    expect(active.text()).toContain("Producción");
    expect(active.classes()).toContain("bg-accent-solid");
    expect(active.classes()).toContain("text-text-on-accent");
  });

  it("marca el destino pendiente", async () => {
    navPendingMock.path = "/settings";

    const wrapper = await mountSuspended(AppBottomNav, {
      props: { currentPage: "recipes", showProduction: true },
    });

    const pending = wrapper.find('a[data-pending="1"]');
    expect(pending.text()).toBe("Configuración");
    expect(pending.classes()).toContain("opacity-70");
  });
});

describe("AppBreadcrumbs", () => {
  it("muestra el padre enlazado y la página actual cuando hay dos niveles", async () => {
    const wrapper = await mountSuspended(AppBreadcrumbs, {
      props: {
        items: [{ label: "Recetas", href: "/recipes" }, { label: "Brownie" }],
      },
    });

    const mobile = wrapper.find('nav[aria-label="Breadcrumb"]');
    expect(mobile.find("a").attributes("href")).toBe("/recipes");
    expect(mobile.text()).toContain("Brownie");

    const desktop = wrapper.findAll('nav[aria-label="Breadcrumb"]')[1];
    expect(desktop?.text()).toContain("Recetas");
    expect(desktop?.text()).toContain("Brownie");
  });

  it("en primer nivel sólo muestra la etiqueta actual", async () => {
    const wrapper = await mountSuspended(AppBreadcrumbs, {
      props: { items: [{ label: "Ingredientes" }] },
    });

    const mobile = wrapper.find('nav[aria-label="Breadcrumb"]');
    expect(mobile.find("a").exists()).toBe(false);
    expect(mobile.text()).toContain("Ingredientes");
  });
});

describe("AppHeader", () => {
  it("muestra la marca sin subtítulo y las migas después del logo", async () => {
    const wrapper = await mountSuspended(AppHeader, {
      props: { breadcrumbs: [{ label: "Recetas" }] },
    });

    const html = wrapper.find("header").html();
    const brand = html.indexOf("KitchCalc");

    expect(html).not.toContain("Costeo");
    expect(brand).toBeLessThan(html.indexOf('data-variant="mobile"'));
    expect(brand).toBeLessThan(html.indexOf('data-variant="desktop"'));
  });

  it("emite openSidebar desde el botón de menú", async () => {
    const onOpenSidebar = vi.fn();
    const wrapper = await mountSuspended(AppHeader, {
      props: { showMenuButton: true, breadcrumbs: [{ label: "Recetas" }] },
      attrs: { onOpenSidebar },
    });

    await wrapper.find("#mobile-menu-btn").trigger("click");
    expect(onOpenSidebar).toHaveBeenCalledTimes(1);
  });

  it("oculta el botón de menú sin sidebar y muestra el logout con sesión", async () => {
    const wrapper = await mountSuspended(AppHeader, {
      props: { showMenuButton: false },
    });

    expect(wrapper.find("#mobile-menu-btn").exists()).toBe(false);
    expect(wrapper.find("#sign-out-button").exists()).toBe(true);
  });

  it("no muestra logout en anónimo", async () => {
    authMock.isAuthenticated = false;

    const wrapper = await mountSuspended(AppHeader, { props: {} });

    expect(wrapper.find("#sign-out-button").exists()).toBe(false);
  });
});

describe("SignOutButton", () => {
  it("cierra sesión contra el relay y navega a sign-in", async () => {
    const wrapper = await mountSuspended(SignOutButton);

    await wrapper.find("button").trigger("click");
    await Promise.resolve();

    expect(apiMock.request).toHaveBeenCalledWith("/api/auth/sign-out", {
      method: "POST",
    });
    expect(navigateMock).toHaveBeenCalledWith("/sign-in", { replace: true });
  });

  it("no repite la mutación mientras está en curso", async () => {
    let resolveRequest: (() => void) | undefined;
    apiMock.request.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveRequest = resolve)),
    );

    const wrapper = await mountSuspended(SignOutButton);
    await wrapper.find("button").trigger("click");
    await wrapper.find("button").trigger("click");

    expect(apiMock.request).toHaveBeenCalledTimes(1);
    resolveRequest?.();
  });
});
