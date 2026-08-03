import { describe, it, expect, vi, beforeEach } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { App } from "astro/app";
import Produccion from "./produccion.astro";
import { setApiBinding } from "@/lib/api-client";
import {
  getDefaultSubscription,
  type UserSubscriptionInfo,
} from "@recetario/stripe";

vi.mock("astro/runtime/server/render/server-islands.js", async (importOriginal) => {
  const mod = await importOriginal<any>();
  return {
    ...mod,
    ServerIslandComponent: class extends mod.ServerIslandComponent {
      async getIslandContent() {
        if (this.props?.canAccess === false) {
          return "<div>Funcion no disponible. Planifica hasta 3 recetas</div>";
        }
        return "<div>Planificador de Producción</div>";
      }
    },
  };
});

const PRO_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: true,
  production_save: true,
  production_advanced: true,
  pdf_export: true,
  advanced_costs: true,
  change_history: true,
  data_import_export: true,
  nutrition_info: true,
  cooking_mode: true,
};

function makeProSubscription(): UserSubscriptionInfo {
  return {
    ...getDefaultSubscription(),
    tier: "pro",
    status: "active",
    recipesLimit: null,
    ingredientsLimit: null,
    features: { ...PRO_FEATURES },
    priceCents: 1000,
    currency: "usd",
    billingInterval: "monthly",
  };
}

function makeProLocals(subscription: UserSubscriptionInfo): App.Locals {
  const appUser = {
    id: "user-1",
    email: "ada@example.com",
    name: "Ada",
    firstName: null,
    lastName: null,
    image: null,
    role: "USER" as const,
    hasPasswordAuth: false,
  };
  return {
    user: appUser,
    session: { user: appUser },
    preferences: {
      userId: "user-1",
      theme: "system",
      accentColor: "coral",
    },
    subscription,
    csrfToken: "test-csrf",
    runtime: { env: {} },
  };
}

const REQUEST = new Request("https://example.com/produccion", {
  headers: { cookie: "session=ada" },
});

const PREFERENCES_RESPONSE = new Response(JSON.stringify({}), {
  status: 200,
  headers: { "content-type": "application/json" },
});

const EMPTY_ARRAY_RESPONSE = new Response("[]", {
  status: 200,
  headers: { "content-type": "application/json" },
});

describe("produccion.astro gating", () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/preferences")) return PREFERENCES_RESPONSE.clone();
      return EMPTY_ARRAY_RESPONSE.clone();
    });
    setApiBinding({ fetch: fetchMock });
  });

  it("renders the production UI for a Pro user", async () => {
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(Produccion, {
      locals: makeProLocals(makeProSubscription()),
      request: REQUEST,
    });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Planificador de Producción");
    expect(html).not.toContain("Funcion no disponible");
  });

  it("renders the upgrade prompt for a Free user (production_planner gated off)", async () => {
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(Produccion, {
      locals: makeProLocals(getDefaultSubscription()),
      request: REQUEST,
    });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Funcion no disponible");
    expect(html).toContain("Planifica hasta 3 recetas");
  });

  it("redirects unauthenticated users to /sign-in", async () => {
    const container = await AstroContainer.create();
    const locals = makeProLocals(getDefaultSubscription());
    locals.session = null;
    locals.user = null;
    const response = await container.renderToResponse(Produccion, {
      locals,
      request: REQUEST,
    });
    expect([301, 302, 303, 307, 308]).toContain(response.status);
    expect(response.headers.get("location")).toBe("/sign-in");
  });
});
