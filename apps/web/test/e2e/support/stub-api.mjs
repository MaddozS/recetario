import { createServer } from "node:http";

/**
 * Stub del worker `apps/api` para los e2e: sin BD, sin Stripe y sin red externa.
 * Vive en `test/e2e/support/` y lo levanta `global-setup.ts`; el build de Nuxt
 * apunta a él con `runtimeConfig.internalApiUrl`.
 */

const PORT = Number(process.env.STUB_API_PORT ?? 8788);
const HOST = "127.0.0.1";
const SESSION_TOKEN = "stub-session-token";

const SESSION_PAYLOAD = {
  user: {
    id: "qa-user",
    email: "qa@example.com",
    name: "QA Prueba",
    firstName: "QA",
    lastName: "Prueba",
    image: null,
    role: "USER",
  },
  session: { id: "stub-session", expiresAt: "2099-01-01T00:00:00.000Z" },
  preferences: { userId: "qa-user", theme: "dark", accentColor: "emerald" },
  subscription: {
    tier: "pro",
    status: "active",
    recipesLimit: null,
    ingredientsLimit: null,
    features: {
      production_planner: true,
      recipe_duplicate: true,
      advanced_costs: true,
    },
    priceCents: null,
    currency: null,
    billingInterval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isTrial: false,
    trialEnd: null,
  },
  hasPasswordAuth: true,
};

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function parseCookies(header) {
  const cookies = {};
  for (const part of (header ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name) cookies[name] = rest.join("=");
  }
  return cookies;
}

/** Catálogo determinista para las vistas de planes (mismo shape que Hono). */
const PLANS = [
  {
    id: "free",
    tier: "free",
    name: "Free",
    description: "Para empezar a costear",
    badge: null,
    currency: "MXN",
    monthlyPriceId: null,
    monthlyDisplay: null,
    yearlyPriceId: null,
    yearlyDisplay: null,
    yearlyPerMonthDisplay: null,
    features: [
      { text: "Hasta 10 recetas", included: true },
      { text: "Duplicar recetas", included: false },
    ],
  },
  {
    id: "basic",
    tier: "basic",
    name: "Basic",
    description: "Para negocios en crecimiento",
    badge: { text: "Recomendado", class: "bg-success-bg text-success" },
    currency: "MXN",
    monthlyPriceId: "price_basic_monthly",
    monthlyDisplay: "$9.99",
    yearlyPriceId: "price_basic_yearly",
    yearlyDisplay: "$95.90",
    yearlyPerMonthDisplay: "$7.99",
    features: [
      { text: "Hasta 75 recetas", included: true },
      { text: "Exportar a PDF", included: false, status: "coming_soon" },
    ],
  },
  {
    id: "pro",
    tier: "pro",
    name: "Pro",
    description: "Para profesionales",
    badge: { text: "Mas popular", class: "bg-accent-700 text-text-on-accent" },
    currency: "MXN",
    monthlyPriceId: "price_pro_monthly",
    monthlyDisplay: "$19.99",
    yearlyPriceId: "price_pro_yearly",
    yearlyDisplay: "$191.90",
    yearlyPerMonthDisplay: "$15.99",
    features: [{ text: "Recetas ilimitadas", included: true }],
  },
];

function sessionPayload({ plan, cookies = {} }) {
  const tier = plan === "free" ? "free" : plan === "basic" ? "basic" : "pro";
  const limits = {
    free: { recipes: 10, ingredients: 30 },
    basic: { recipes: 75, ingredients: null },
    pro: { recipes: null, ingredients: null },
  }[tier];
  const features = {
    free: {
      production_planner: false,
      recipe_duplicate: false,
      advanced_costs: false,
    },
    basic: {
      production_planner: true,
      recipe_duplicate: true,
      advanced_costs: true,
    },
    pro: {
      production_planner: true,
      recipe_duplicate: true,
      advanced_costs: true,
    },
  }[tier];

  return {
    ...SESSION_PAYLOAD,
    user: {
      ...SESSION_PAYLOAD.user,
      firstName: settingsState.firstName,
      lastName: settingsState.lastName,
      name: `${settingsState.firstName} ${settingsState.lastName}`,
    },
    preferences: {
      userId: "qa-user",
      theme: settingsState.preferences.theme,
      accentColor: settingsState.preferences.accentColor,
    },
    subscription: subscriptionFor(
      {
        ...SESSION_PAYLOAD.subscription,
        tier,
        recipesLimit: limits.recipes,
        ingredientsLimit: limits.ingredients,
        priceCents: tier === "free" ? null : tier === "basic" ? 999 : 1999,
        currency: tier === "free" ? null : "MXN",
        billingInterval: tier === "free" ? null : "monthly",
        features,
      },
      cookies,
    ),
  };
}

/** ── Cuenta, preferencias y billing (Task 11): estado en memoria ─────────── */

/**
 * Un único estado para cuenta/preferencias/billing; cada spec lo resetea con
 * `POST /api/__qa/settings/reset` para ser determinista. Las suscripciones se
 * controlan con cookies: `qa-plan` (free|basic|pro) y `qa-subscription`
 * (trial|canceled|scheduled).
 */
function createSettingsState() {
  return {
    firstName: "QA",
    lastName: "Prueba",
    preferences: { theme: "dark", accentColor: "emerald" },
    nameAttempts: 0,
    passwordAttempts: 0,
    preferencesPutAttempts: 0,
    portalAttempts: 0,
    syncAttempts: 0,
    checkoutAttempts: 0,
    lastCheckout: null,
    synced: false,
  };
}

let settingsState = createSettingsState();

function readSettingsState() {
  return clone(settingsState);
}

/** Escenarios de suscripción por cookie, compartidos por sesión y billing. */
function subscriptionFor(base, cookies = {}) {
  const scenario = cookies["qa-subscription"];

  if (scenario === "trial") {
    return {
      ...base,
      status: "trialing",
      isTrial: true,
      trialEnd: "2026-10-01T12:00:00.000Z",
      currentPeriodEnd: "2026-10-01T12:00:00.000Z",
    };
  }

  if (scenario === "canceled") {
    return {
      ...base,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-10-15T12:00:00.000Z",
    };
  }

  if (scenario === "scheduled") {
    return { ...base, currentPeriodEnd: "2026-10-15T12:00:00.000Z" };
  }

  return base;
}

function subscriptionResponse(plan, cookies) {
  const base = sessionPayload({ plan }).subscription;
  const scheduled =
    cookies["qa-subscription"] === "scheduled"
      ? {
          targetTier: "basic",
          targetPlanName: "KitchCalc Basic Mensual",
          targetInterval: "monthly",
          effectiveDate: "2026-10-15T12:00:00.000Z",
        }
      : null;

  return {
    ...subscriptionFor(
      { ...base, currentPeriodEnd: "2026-10-15T12:00:00.000Z" },
      cookies,
    ),
    scheduledChange: scheduled,
  };
}

/**
 * Doble-submit del CSRF como Hono: una petición de navegador (con `Origin`)
 * necesita el header; las internas sin `Origin` (SSR por el relay) pasan por
 * diseño. Así el stub falla si el cliente olvida el token.
 */
function csrfAllowed(req) {
  if (!req.headers.origin) return true;
  return Boolean(req.headers["x-csrf-token"]);
}

function unauthorized(res) {
  return sendJson(res, 401, {
    error: { code: "UNAUTHENTICATED", message: "Authentication required" },
  });
}

function forbiddenCsrf(res) {
  return sendJson(res, 403, {
    error: { code: "FORBIDDEN", message: "CSRF validation failed" },
  });
}

/** ── Ingredientes (Task 7): estado en memoria, sin BD ─────────────────────── */

const SEED_INGREDIENTS = [
  {
    id: 1,
    name: "Harina de trigo",
    unit: "kg",
    price: 25,
    purchaseQuantity: 1,
    brand: "Del Campo",
    supplier: "Casa Santos",
  },
  {
    id: 2,
    name: "Plátano",
    unit: "kg",
    price: 18,
    purchaseQuantity: 2,
    brand: null,
    supplier: null,
  },
];

const SEED_USAGE = { 1: [{ id: 10, name: "Tarta de Chocolate" }] };

/** Copia profunda por JSON: el stub sólo maneja datos serializables. */
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createIngredientState(seed = {}) {
  return {
    ingredients: (seed.ingredients ?? SEED_INGREDIENTS).map((item) => ({
      ...item,
    })),
    usage: clone(seed.usage ?? SEED_USAGE),
    postAttempts: 0,
  };
}

let ingredientState = createIngredientState();

function readIngredientState() {
  return {
    ingredients: ingredientState.ingredients.map((item) => ({ ...item })),
    usage: clone(ingredientState.usage),
    postAttempts: ingredientState.postAttempts,
  };
}

function ingredientUsageMap() {
  return Object.fromEntries(
    Object.entries(ingredientState.usage).map(([id, recipes]) => [
      id,
      recipes.map((recipe) => recipe.name),
    ]),
  );
}

/** Igual que Hono: los nulos de marca/proveedor se omiten en la respuesta. */
function toIngredientResponse(item) {
  return {
    id: item.id,
    name: item.name,
    unit: item.unit,
    price: item.price,
    purchaseQuantity: item.purchaseQuantity,
    ...(item.brand ? { brand: item.brand } : {}),
    ...(item.supplier ? { supplier: item.supplier } : {}),
  };
}

/** ── Recetas (Tasks 8 y 9): estado en memoria, sin BD ───────────────────── */

/**
 * Cada receta guarda su detalle (Task 9): `ingredients` son filas
 * `RecipeIngredient` que se unen con `ingredientState` al responder. La Tarta
 * repite la harina (0.5 kg + 100 g) para cubrir el ingrediente repetido y su
 * costo directo es $33.00 con los precios sembrados.
 */
const SEED_RECIPES = [
  {
    id: 1,
    name: "Tarta de Chocolate",
    category: "Postres",
    desiredMargin: 30,
    fixedCostsPercentage: 10,
    recipeFixedCosts: [],
    updatedAt: "2026-09-14T10:00:00.000Z",
    ingredients: [
      { ingredientId: 1, quantity: 0.5, unit: "kg", comment: "Para la masa" },
      { ingredientId: 2, quantity: 2, unit: "kg" },
      { ingredientId: 1, quantity: 100, unit: "g" },
    ],
  },
  {
    id: 2,
    name: "Pan de Masa Madre",
    category: "Panes",
    desiredMargin: 25,
    fixedCostsPercentage: 5,
    recipeFixedCosts: [],
    updatedAt: "2026-09-13T10:00:00.000Z",
    ingredients: [
      { ingredientId: 1, quantity: 1, unit: "kg" },
      { ingredientId: 2, quantity: 0.5, unit: "kg" },
    ],
  },
  {
    id: 3,
    name: "Brownie Clásico",
    category: null,
    desiredMargin: 30,
    fixedCostsPercentage: 0,
    recipeFixedCosts: [],
    updatedAt: "2026-09-15T09:00:00.000Z",
    ingredients: [],
  },
];

/**
 * Normaliza cada receta sembrada: los seeds de la Task 8 traían sólo el resumen
 * (`ingredientCount`), así que se conserva ese valor y se rellena el detalle.
 * Un fallo aquí tumba el proceso entero y con él todos los specs.
 */
function normalizeRecipe(recipe) {
  const ingredients = clone(recipe.ingredients ?? []);

  return {
    ...recipe,
    desiredMargin: recipe.desiredMargin ?? 0,
    fixedCostsPercentage: recipe.fixedCostsPercentage ?? 0,
    recipeFixedCosts: clone(recipe.recipeFixedCosts ?? []),
    presentations: clone(recipe.presentations ?? []),
    ingredients,
    ingredientCount: recipe.ingredientCount ?? ingredients.length,
  };
}

function createRecipeState(seed = {}) {
  return {
    recipes: clone(seed.recipes ?? SEED_RECIPES).map(normalizeRecipe),
    postAttempts: 0,
    patchAttempts: 0,
    deleteAttempts: 0,
    fixedCostAttempts: 0,
    presentationAttempts: 0,
    byIdsAttempts: 0,
    lastPresentationPatch: null,
  };
}

let recipeState = createRecipeState();

function readRecipeState() {
  return {
    recipes: clone(recipeState.recipes),
    postAttempts: recipeState.postAttempts,
    patchAttempts: recipeState.patchAttempts,
    deleteAttempts: recipeState.deleteAttempts,
    fixedCostAttempts: recipeState.fixedCostAttempts,
    presentationAttempts: recipeState.presentationAttempts,
    byIdsAttempts: recipeState.byIdsAttempts,
    lastPresentationPatch: clone(recipeState.lastPresentationPatch),
  };
}

/** Como Hono: las categorías nulas se omiten en la respuesta. */
function toRecipeSummaryResponse(recipe) {
  return {
    id: recipe.id,
    name: recipe.name,
    ...(recipe.category ? { category: recipe.category } : {}),
    ingredientCount:
      recipe.ingredientCount ?? (recipe.ingredients ?? []).length,
    ...(recipe.updatedAt ? { updatedAt: recipe.updatedAt } : {}),
  };
}

/**
 * Presentación tal como la devuelve el detalle (`presentationSchema`): con sus
 * costos fijos anidados. El listado de presentaciones y el PATCH no los traen.
 */
function toPresentationDetail(presentation) {
  return {
    id: presentation.id,
    name: presentation.name,
    unitsPerBatch: Number(presentation.unitsPerBatch),
    salePrice:
      presentation.salePrice === null || presentation.salePrice === undefined
        ? null
        : Number(presentation.salePrice),
    fixedCosts: clone(presentation.fixedCosts ?? []),
  };
}

function toPresentationResponse(recipeId, presentation) {
  return {
    id: presentation.id,
    recipeId,
    name: presentation.name,
    unitsPerBatch: Number(presentation.unitsPerBatch),
    salePrice:
      presentation.salePrice === null || presentation.salePrice === undefined
        ? null
        : Number(presentation.salePrice),
  };
}

/** Costo fijo dentro del detalle: `recipeFixedCostSchema` exige `recipeId`. */
function toFixedCostDetail(recipeId, fixedCost) {
  return {
    id: fixedCost.id,
    recipeId,
    name: fixedCost.name,
    type: fixedCost.type,
    base: fixedCost.base,
    value: Number(fixedCost.value),
    hours: fixedCost.hours ?? null,
  };
}

/** Costo fijo tal como lo devuelven crear/actualizar en Hono. */
function toFixedCostResponse(recipeId, fixedCost) {
  return {
    id: fixedCost.id,
    recipeId,
    name: fixedCost.name,
    type: fixedCost.type,
    base: fixedCost.base,
    value: Number(fixedCost.value),
    hours: fixedCost.hours ?? null,
  };
}

/**
 * Detalle completo (`recipeWithIngredientsSchema`): igual que Hono, los campos
 * opcionales nulos se omiten y cada fila trae su ingrediente anidado.
 */
function toRecipeDetailResponse(recipe) {
  return {
    id: recipe.id,
    name: recipe.name,
    ...(recipe.category ? { category: recipe.category } : {}),
    desiredMargin: recipe.desiredMargin ?? 0,
    fixedCostsPercentage: recipe.fixedCostsPercentage ?? 0,
    ...(recipe.updatedAt ? { updatedAt: recipe.updatedAt } : {}),
    ingredients: recipe.ingredients
      .map((row) => {
        const ingredient = ingredientState.ingredients.find(
          (item) => item.id === row.ingredientId,
        );
        if (!ingredient) return null;

        return {
          ingredientId: row.ingredientId,
          quantity: row.quantity,
          unit: row.unit,
          ...(row.comment ? { comment: row.comment } : {}),
          ingredient: toIngredientResponse(ingredient),
        };
      })
      .filter(Boolean),
    presentations: (recipe.presentations ?? []).map(toPresentationDetail),
    recipeFixedCosts: (recipe.recipeFixedCosts ?? []).map((fixedCost) =>
      toFixedCostDetail(recipe.id, fixedCost),
    ),
  };
}

/** Igual que Hono: el nombre del duplicado se prefija y se recorta a 120. */
function duplicatedName(sourceName) {
  const maxNameLength = 120;
  const name = `Copia de ${sourceName}`;
  return name.length > maxNameLength
    ? `${name.slice(0, maxNameLength - 1)}\u2026`
    : name;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const cookies = parseCookies(req.headers.cookie);
  const body = await readBody(req);
  const pathname = url.pathname;

  // ── Autenticación (Better Auth) ────────────────────────────────────────────
  if (pathname === "/api/auth/session" && req.method === "GET") {
    const authenticated =
      cookies["better-auth.session_token"] === SESSION_TOKEN;
    // `qa-plan=free` permite cubrir los dos estados de gating del shell.
    return sendJson(
      res,
      200,
      authenticated
        ? sessionPayload({ plan: cookies["qa-plan"], cookies })
        : null,
    );
  }

  if (pathname === "/api/auth/sign-in/email" && req.method === "POST") {
    const payload = JSON.parse(body || "{}");

    // Mismo contrato que Better Auth: credenciales inválidas, email sin
    // verificar (con reenvío disponible) y sesión creada.
    if (payload.email === "unverified@example.com") {
      return sendJson(res, 403, {
        message: "Email not verified",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    if (payload.password !== "Temporal123!") {
      return sendJson(res, 401, {
        message: "Invalid email or password",
        code: "INVALID_EMAIL_OR_PASSWORD",
      });
    }

    return sendJson(
      res,
      200,
      { user: SESSION_PAYLOAD.user },
      {
        "set-cookie": `better-auth.session_token=${SESSION_TOKEN}; Path=/; HttpOnly; SameSite=Lax`,
      },
    );
  }

  if (pathname === "/api/auth/sign-up/email" && req.method === "POST") {
    const payload = JSON.parse(body || "{}");

    // `requireEmailVerification` desactiva el auto-sign-in: 200 sin cookie.
    return sendJson(res, 200, {
      token: null,
      user: {
        id: "stub-new-user",
        email: payload.email ?? null,
        name: payload.name ?? null,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
      },
    });
  }

  if (
    pathname === "/api/auth/send-verification-email" &&
    req.method === "POST"
  ) {
    return sendJson(res, 200, { status: true });
  }

  if (pathname === "/api/auth/sign-in/social" && req.method === "POST") {
    const payload = JSON.parse(body || "{}");
    const origin = req.headers.origin ?? `http://${HOST}:3000`;

    // Sin tocar Google: el e2e comprueba el POST y la navegación al `url`.
    return sendJson(res, 200, {
      url: `${origin}/sign-in?oauth=stub&provider=${payload.provider ?? "google"}`,
      redirect: true,
    });
  }

  if (pathname === "/api/auth/forgot-password" && req.method === "POST") {
    const payload = JSON.parse(body || "{}");
    if (!payload.email) {
      return sendJson(res, 400, {
        error: "Email requerido",
        code: "INVALID_DATA",
      });
    }

    // Anti-enumeración: misma respuesta exista o no el email.
    return sendJson(res, 200, {
      success: true,
      message:
        "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
    });
  }

  if (pathname === "/api/auth/reset-password" && req.method === "GET") {
    const token = url.searchParams.get("token");

    if (token === "reset-valid" || token === "reset-short") {
      const remainingSeconds = token === "reset-valid" ? 540 : 2;
      return sendJson(res, 200, {
        valid: true,
        expiresAt: new Date(Date.now() + remainingSeconds * 1000).toISOString(),
        remainingSeconds,
        formattedTime: token === "reset-valid" ? "09:00" : "00:02",
      });
    }

    if (token === "reset-expired") {
      return sendJson(res, 200, {
        valid: false,
        error: "El enlace ha expirado",
        code: "EXPIRED",
      });
    }

    return sendJson(res, 200, {
      valid: false,
      error: "Enlace inválido o inexistente",
      code: "NOT_FOUND",
    });
  }

  if (pathname === "/api/auth/reset-password" && req.method === "POST") {
    const payload = JSON.parse(body || "{}");

    if (payload.token === "reset-expired") {
      return sendJson(res, 400, {
        error: "El enlace ha expirado",
        code: "EXPIRED",
      });
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
        payload.password ?? "",
      )
    ) {
      return sendJson(res, 400, {
        error: "La contraseña no cumple los requisitos",
        code: "INVALID_PASSWORD",
        errors: ["Al menos 8 caracteres"],
      });
    }

    return sendJson(res, 200, {
      success: true,
      message: "Contraseña actualizada correctamente",
    });
  }

  if (pathname === "/api/auth/verify-email" && req.method === "GET") {
    if (url.searchParams.get("token") === "verify-valid") {
      return sendJson(res, 200, { status: true, user: null });
    }

    return sendJson(res, 401, {
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }

  if (pathname === "/api/auth/sign-out" && req.method === "POST") {
    // Como Better Auth: exige `content-type` JSON en la mutación (el cliente
    // manda `{}` aunque no tenga datos), así el e2e falla si el transporte
    // vuelve a mandar un POST sin body.
    if (!(req.headers["content-type"] ?? "").startsWith("application/json")) {
      return sendJson(res, 415, {
        message: "Content-Type is required. Allowed types: application/json",
        code: "UNSUPPORTED_MEDIA_TYPE",
      });
    }

    return sendJson(
      res,
      200,
      { success: true },
      {
        "set-cookie":
          "better-auth.session_token=; Path=/; Max-Age=0; SameSite=Lax",
      },
    );
  }

  // ── Planes públicos y checkout ────────────────────────────────────────────
  if (pathname === "/api/billing/plans" && req.method === "GET") {
    return sendJson(res, 200, PLANS);
  }

  if (pathname === "/api/stripe/checkout" && req.method === "POST") {
    // Hono exige auth + doble-submit CSRF: el stub rechaza una petición de
    // navegador sin `x-csrf-token` para que el e2e falle si el cliente lo omite.
    if (!csrfAllowed(req)) {
      return sendJson(res, 403, {
        error: { code: "FORBIDDEN", message: "CSRF validation failed" },
      });
    }

    const payload = JSON.parse(body || "{}");
    if (!payload.priceId) {
      return sendJson(res, 400, {
        error: { code: "VALIDATION_ERROR", message: "priceId required" },
      });
    }

    settingsState.checkoutAttempts += 1;
    settingsState.lastCheckout = payload;

    // Flujo real: Stripe redirige al `successUrl` que mandó el cliente.
    return sendJson(res, 200, {
      url: payload.successUrl ?? "/pricing?success=1",
    });
  }

  // ── Cuenta y preferencias (Task 11) ───────────────────────────────────────
  if (
    pathname.startsWith("/api/account") ||
    pathname === "/api/preferences" ||
    pathname === "/api/billing/subscription" ||
    pathname === "/api/stripe/portal" ||
    pathname === "/api/stripe/sync-session"
  ) {
    if (cookies["better-auth.session_token"] !== SESSION_TOKEN) {
      return unauthorized(res);
    }
  }

  if (pathname === "/api/account/update-name" && req.method === "POST") {
    if (!csrfAllowed(req)) return forbiddenCsrf(res);

    settingsState.nameAttempts += 1;
    const payload = JSON.parse(body || "{}");
    const firstName = String(payload.firstName ?? "").trim();
    const lastName = String(payload.lastName ?? "").trim();

    if (!firstName || !lastName) {
      return sendJson(res, 400, {
        error: { code: "VALIDATION_ERROR", message: "Invalid account payload" },
      });
    }

    // Sentinela para cubrir el error genérico sin CTA de plan.
    if (firstName === "Fallo") {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "Fallo simulado del servidor" },
      });
    }

    settingsState.firstName = firstName;
    settingsState.lastName = lastName;
    return sendJson(res, 200, { firstName, lastName });
  }

  if (pathname === "/api/account/change-password" && req.method === "POST") {
    if (!csrfAllowed(req)) return forbiddenCsrf(res);

    settingsState.passwordAttempts += 1;
    const payload = JSON.parse(body || "{}");

    if (payload.currentPassword !== "Temporal123!") {
      return sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "La contraseña actual es incorrecta.",
        },
      });
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
        payload.newPassword ?? "",
      )
    ) {
      return sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          message:
            "La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.",
        },
      });
    }

    return sendJson(res, 200, { ok: true });
  }

  if (pathname === "/api/preferences" && req.method === "GET") {
    return sendJson(res, 200, {
      userId: "qa-user",
      ...settingsState.preferences,
    });
  }

  if (pathname === "/api/preferences" && req.method === "PUT") {
    if (!csrfAllowed(req)) return forbiddenCsrf(res);

    settingsState.preferencesPutAttempts += 1;

    // Sentinela `qa-prefs=error` para el rollback visual del formulario.
    if (cookies["qa-prefs"] === "error") {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "Fallo simulado del servidor" },
      });
    }

    const payload = JSON.parse(body || "{}");
    // Como Hono: un PUT parcial conserva lo persistido y devuelve la fila.
    if (payload.theme !== undefined)
      settingsState.preferences.theme = payload.theme;
    if (payload.accentColor !== undefined) {
      settingsState.preferences.accentColor = payload.accentColor;
    }

    return sendJson(res, 200, {
      userId: "qa-user",
      ...settingsState.preferences,
    });
  }

  // ── Facturación (Task 11) ─────────────────────────────────────────────────
  if (pathname === "/api/billing/subscription" && req.method === "GET") {
    // La sincronización del checkout simula el cambio a Basic (paridad con la
    // ingesta real) y el plan Free responde 404 como Hono.
    if (settingsState.synced) {
      return sendJson(
        res,
        200,
        subscriptionResponse("basic", {
          ...cookies,
          "qa-subscription": undefined,
        }),
      );
    }

    if ((cookies["qa-plan"] ?? "pro") === "free") {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "No active subscription" },
      });
    }

    return sendJson(
      res,
      200,
      subscriptionResponse(cookies["qa-plan"] ?? "pro", cookies),
    );
  }

  if (pathname === "/api/stripe/portal" && req.method === "POST") {
    if (!csrfAllowed(req)) return forbiddenCsrf(res);

    settingsState.portalAttempts += 1;

    if (cookies["qa-portal"] === "error") {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "No se pudo abrir el portal." },
      });
    }

    return sendJson(res, 200, { url: "/api/health?portal=1" });
  }

  if (pathname === "/api/stripe/sync-session" && req.method === "POST") {
    if (!csrfAllowed(req)) return forbiddenCsrf(res);

    settingsState.syncAttempts += 1;

    if (cookies["qa-sync"] === "error") {
      return sendJson(res, 500, {
        error: {
          code: "INTERNAL",
          message: "No se pudo sincronizar la suscripción.",
        },
      });
    }

    settingsState.synced = true;
    return sendJson(res, 200, { ok: true });
  }

  // ── Ingredientes (Task 7) ─────────────────────────────────────────────────
  if (
    pathname.startsWith("/api/ingredients") ||
    pathname === "/api/usage-counts"
  ) {
    if (cookies["better-auth.session_token"] !== SESSION_TOKEN) {
      return sendJson(res, 401, {
        error: { code: "UNAUTHENTICATED", message: "Authentication required" },
      });
    }
  }

  if (pathname === "/api/usage-counts" && req.method === "GET") {
    // `qa-usage=low` deja el remanente en los umbrales de aviso (recetas 3,
    // ingredientes 5) para el plan Free.
    if (cookies["qa-usage"] === "low") {
      return sendJson(res, 200, { recipes: 9, ingredients: 29 });
    }

    return sendJson(res, 200, {
      recipes: 2,
      ingredients: ingredientState.ingredients.length,
    });
  }

  if (pathname === "/api/ingredients/usage" && req.method === "GET") {
    return sendJson(res, 200, ingredientUsageMap());
  }

  if (pathname === "/api/ingredients" && req.method === "GET") {
    return sendJson(
      res,
      200,
      ingredientState.ingredients.map(toIngredientResponse),
    );
  }

  if (pathname === "/api/ingredients" && req.method === "POST") {
    ingredientState.postAttempts += 1;
    const payload = JSON.parse(body || "{}");

    // `qa-plan=free` reproduce el límite real de 30 ingredientes.
    if (
      cookies["qa-plan"] === "free" &&
      ingredientState.ingredients.length >= 30
    ) {
      return sendJson(res, 403, {
        error: {
          code: "PLAN_LIMIT",
          message: "Ingredient limit reached for your plan (30)",
        },
      });
    }

    // Sentinela para cubrir el camino de error genérico sin CTA de upgrade.
    if (payload.name === "Fallo simulado") {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "Fallo simulado del servidor" },
      });
    }

    if (
      !payload.name ||
      !Number.isFinite(payload.price) ||
      !(payload.purchaseQuantity > 0)
    ) {
      return sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid ingredient input",
        },
      });
    }

    const created = {
      id:
        Math.max(0, ...ingredientState.ingredients.map((item) => item.id)) + 1,
      name: payload.name,
      unit: payload.unit ?? "kg",
      price: payload.price,
      purchaseQuantity: payload.purchaseQuantity,
      brand: payload.brand ?? null,
      supplier: payload.supplier ?? null,
    };
    ingredientState.ingredients.push(created);
    return sendJson(res, 201, toIngredientResponse(created));
  }

  const ingredientMatch = pathname.match(/^\/api\/ingredients\/(\d+)$/);

  if (ingredientMatch && req.method === "PATCH") {
    const id = Number(ingredientMatch[1]);
    const payload = JSON.parse(body || "{}");
    const target = ingredientState.ingredients.find((item) => item.id === id);

    if (!target) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Ingredient not found" },
      });
    }

    Object.assign(target, {
      name: payload.name ?? target.name,
      unit: payload.unit ?? target.unit,
      price: payload.price ?? target.price,
      purchaseQuantity: payload.purchaseQuantity ?? target.purchaseQuantity,
      brand: payload.brand ?? null,
      supplier: payload.supplier ?? null,
    });

    return sendJson(res, 200, toIngredientResponse(target));
  }

  if (ingredientMatch && req.method === "DELETE") {
    const id = Number(ingredientMatch[1]);
    const index = ingredientState.ingredients.findIndex(
      (item) => item.id === id,
    );

    if (index === -1) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Ingredient not found" },
      });
    }

    const recipes = ingredientState.usage[String(id)] ?? [];
    if (recipes.length > 0) {
      // Como Hono: `recipes` viaja fuera del envelope de error.
      return sendJson(res, 409, {
        error: {
          code: "DOMAIN_ERROR",
          message: "Ingredient is in use by existing recipes",
          reason: "ingredient_in_use",
        },
        recipes: recipes.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
        })),
      });
    }

    ingredientState.ingredients.splice(index, 1);
    res.writeHead(204);
    return res.end();
  }

  const ingredientUsageMatch = pathname.match(
    /^\/api\/ingredients\/(\d+)\/usage$/,
  );

  if (ingredientUsageMatch && req.method === "GET") {
    const id = Number(ingredientUsageMatch[1]);
    const target = ingredientState.ingredients.find((item) => item.id === id);

    if (!target) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Ingredient not found" },
      });
    }

    return sendJson(res, 200, {
      recipes: ingredientState.usage[String(id)] ?? [],
    });
  }

  // ── Recetas (Tasks 8 y 9) ────────────────────────────────────────────────
  const isRecipePath =
    pathname === "/api/recipes" || pathname.startsWith("/api/recipes/");

  if (isRecipePath && cookies["better-auth.session_token"] !== SESSION_TOKEN) {
    return sendJson(res, 401, {
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    });
  }

  if (pathname === "/api/recipes" && req.method === "GET") {
    return sendJson(res, 200, recipeState.recipes.map(toRecipeSummaryResponse));
  }

  // Planificador de producción (Task 12): el detalle de la selección. Como Hono,
  // exige la feature del plan y el tope de 3 recetas fuera de Pro.
  if (pathname === "/api/recipes/by-ids" && req.method === "GET") {
    recipeState.byIdsAttempts += 1;

    const ids = (url.searchParams.get("ids") ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (ids.length === 0) {
      return sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          message:
            "ids query parameter must contain at least one positive integer",
        },
      });
    }

    if (ids.length > 100) {
      return sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "ids query parameter cannot contain more than 100 ids",
        },
      });
    }

    if (cookies["qa-plan"] === "free") {
      return sendJson(res, 403, {
        error: {
          code: "FEATURE_REQUIRED",
          message: "Feature not available in your plan: production_planner",
        },
      });
    }

    if (cookies["qa-plan"] === "basic" && ids.length > 3) {
      return sendJson(res, 403, {
        error: {
          code: "PLAN_LIMIT",
          message: "Production planner supports up to 3 recipes on your plan",
        },
      });
    }

    return sendJson(
      res,
      200,
      ids
        .map((id) => recipeState.recipes.find((recipe) => recipe.id === id))
        .filter(Boolean)
        .map(toRecipeDetailResponse),
    );
  }

  if (pathname === "/api/recipes" && req.method === "POST") {
    recipeState.postAttempts += 1;
    const payload = JSON.parse(body || "{}");

    // `qa-plan=free` reproduce el límite real de 10 recetas.
    if (cookies["qa-plan"] === "free" && recipeState.recipes.length >= 10) {
      return sendJson(res, 403, {
        error: {
          code: "PLAN_LIMIT",
          message: "Recipe limit reached for your plan (10)",
        },
      });
    }

    // Sentinela para cubrir el camino de error genérico sin CTA de upgrade.
    if (payload.name === "Fallo simulado") {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "Fallo simulado del servidor" },
      });
    }

    if (!payload.name || typeof payload.name !== "string") {
      return sendJson(res, 400, {
        error: { code: "VALIDATION_ERROR", message: "Invalid recipe input" },
      });
    }

    const created = {
      id: Math.max(0, ...recipeState.recipes.map((item) => item.id)) + 1,
      name: payload.name,
      category: null,
      desiredMargin: 0,
      fixedCostsPercentage: 0,
      recipeFixedCosts: [],
      // Igual que los seeds: sin el array, crear una presentación sobre una
      // receta recién creada reventaba el stub (y tumbaba la suite entera).
      presentations: [],
      updatedAt: new Date().toISOString(),
      ingredients: [],
      ingredientCount: 0,
    };
    recipeState.recipes.push(created);

    return sendJson(res, 201, toRecipeDetailResponse(created));
  }

  const recipeDuplicateMatch = pathname.match(
    /^\/api\/recipes\/(\d+)\/duplicate$/,
  );

  if (recipeDuplicateMatch && req.method === "POST") {
    if (cookies["qa-plan"] === "free") {
      return sendJson(res, 403, {
        error: {
          code: "FEATURE_REQUIRED",
          message: "Feature not available in your plan: recipe_duplicate",
        },
      });
    }

    const id = Number(recipeDuplicateMatch[1]);
    const source = recipeState.recipes.find((item) => item.id === id);

    if (!source) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Recipe not found" },
      });
    }

    const copy = {
      id: Math.max(0, ...recipeState.recipes.map((item) => item.id)) + 1,
      name: duplicatedName(source.name),
      category: source.category,
      desiredMargin: source.desiredMargin,
      fixedCostsPercentage: source.fixedCostsPercentage,
      recipeFixedCosts: clone(source.recipeFixedCosts ?? []),
      updatedAt: new Date().toISOString(),
      ingredients: clone(source.ingredients ?? []),
      ingredientCount: source.ingredientCount ?? 0,
    };
    recipeState.recipes.push(copy);

    return sendJson(res, 201, toRecipeDetailResponse(copy));
  }

  const recipeMatch = pathname.match(/^\/api\/recipes\/(\d+)$/);

  if (recipeMatch && req.method === "GET") {
    const id = Number(recipeMatch[1]);
    const recipe = recipeState.recipes.find((item) => item.id === id);

    if (!recipe) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Recipe not found" },
      });
    }

    return sendJson(res, 200, toRecipeDetailResponse(recipe));
  }

  if (recipeMatch && req.method === "PATCH") {
    recipeState.patchAttempts += 1;

    const id = Number(recipeMatch[1]);
    const recipe = recipeState.recipes.find((item) => item.id === id);

    if (!recipe) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Recipe not found" },
      });
    }

    const payload = JSON.parse(body || "{}");

    // Sentinela para cubrir el error genérico de guardado sin CTA de plan.
    if (payload.name === "Fallo simulado") {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "Fallo simulado del servidor" },
      });
    }

    if (
      typeof payload.name !== "string" ||
      !Array.isArray(payload.ingredients)
    ) {
      return sendJson(res, 400, {
        error: { code: "VALIDATION_ERROR", message: "Invalid recipe input" },
      });
    }

    // Igual que Hono: el guardado reemplaza la lista de ingredientes completa.
    recipe.name = payload.name;
    recipe.category = payload.category ? String(payload.category) : null;
    recipe.desiredMargin = Number(
      payload.desiredMargin ?? recipe.desiredMargin,
    );
    recipe.fixedCostsPercentage = Number(
      payload.fixedCostsPercentage ?? recipe.fixedCostsPercentage,
    );
    recipe.ingredients = payload.ingredients.map((row) => ({
      ingredientId: Number(row.ingredientId),
      quantity: Number(row.quantity),
      unit: String(row.unit ?? "unidad"),
      ...(row.comment ? { comment: String(row.comment) } : {}),
    }));
    recipe.ingredientCount = recipe.ingredients.length;
    recipe.updatedAt = new Date().toISOString();

    return sendJson(res, 200, toRecipeDetailResponse(recipe));
  }

  if (recipeMatch && req.method === "DELETE") {
    recipeState.deleteAttempts += 1;
    const id = Number(recipeMatch[1]);
    const index = recipeState.recipes.findIndex((item) => item.id === id);

    if (index === -1) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Recipe not found" },
      });
    }

    recipeState.recipes.splice(index, 1);
    res.writeHead(204);
    return res.end();
  }

  // ── Costos fijos de receta y presentaciones (Task 10) ────────────────────
  const SENTINEL_NAME = "Fallo simulado";

  function recipeById(id) {
    return recipeState.recipes.find((recipe) => recipe.id === id);
  }

  const fixedCostCreateMatch = pathname.match(
    /^\/api\/recipes\/(\d+)\/fixed-costs$/,
  );

  if (fixedCostCreateMatch && req.method === "POST") {
    recipeState.fixedCostAttempts += 1;
    const recipeId = Number(fixedCostCreateMatch[1]);
    const recipe = recipeById(recipeId);

    if (!recipe) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Recipe not found" },
      });
    }

    const payload = JSON.parse(body || "{}");

    if (payload.name === SENTINEL_NAME) {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "Fallo simulado del servidor" },
      });
    }

    const value = Number(payload.value);
    if (!Number.isFinite(value) || value <= 0) {
      return sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid fixed cost input",
        },
      });
    }

    const created = {
      id: Math.max(0, ...recipe.recipeFixedCosts.map((fc) => fc.id)) + 1,
      name: payload.name ?? "Costo Fijo",
      type: payload.type ?? "AMOUNT",
      base: payload.base ?? "PER_BATCH",
      value,
      hours: payload.hours ?? null,
    };
    recipe.recipeFixedCosts.push(created);

    return sendJson(res, 201, toFixedCostResponse(recipeId, created));
  }

  const fixedCostItemMatch = pathname.match(
    /^\/api\/recipes\/(\d+)\/fixed-costs\/(\d+)$/,
  );

  if (fixedCostItemMatch && req.method === "PATCH") {
    recipeState.fixedCostAttempts += 1;
    const recipeId = Number(fixedCostItemMatch[1]);
    const fixedCostId = Number(fixedCostItemMatch[2]);
    const recipe = recipeById(recipeId);
    const target = recipe?.recipeFixedCosts.find(
      (fixedCost) => fixedCost.id === fixedCostId,
    );

    if (!recipe || !target) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Fixed cost not found" },
      });
    }

    const payload = JSON.parse(body || "{}");

    if (payload.name === SENTINEL_NAME) {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "Fallo simulado del servidor" },
      });
    }

    const value = Number(payload.value);
    if (!Number.isFinite(value) || value <= 0) {
      return sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid fixed cost input",
        },
      });
    }

    // Igual que Hono: sólo se aplican las claves presentes en el payload.
    if (payload.name !== undefined) target.name = payload.name;
    if (payload.type !== undefined) target.type = payload.type;
    if (payload.base !== undefined) target.base = payload.base;
    target.value = value;
    if (payload.hours !== undefined) target.hours = payload.hours;

    return sendJson(res, 200, toFixedCostResponse(recipeId, target));
  }

  if (fixedCostItemMatch && req.method === "DELETE") {
    recipeState.fixedCostAttempts += 1;
    const recipeId = Number(fixedCostItemMatch[1]);
    const fixedCostId = Number(fixedCostItemMatch[2]);
    const recipe = recipeById(recipeId);
    const index =
      recipe?.recipeFixedCosts.findIndex((fc) => fc.id === fixedCostId) ?? -1;

    if (!recipe || index === -1) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Fixed cost not found" },
      });
    }

    recipe.recipeFixedCosts.splice(index, 1);
    res.writeHead(204);
    return res.end();
  }

  const presentationsMatch = pathname.match(
    /^\/api\/recipes\/(\d+)\/presentations$/,
  );

  if (presentationsMatch && req.method === "POST") {
    recipeState.presentationAttempts += 1;
    const recipeId = Number(presentationsMatch[1]);
    const recipe = recipeById(recipeId);

    if (!recipe) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Recipe not found" },
      });
    }

    const payload = JSON.parse(body || "{}");

    if (payload.name === SENTINEL_NAME) {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "Fallo simulado del servidor" },
      });
    }

    const unitsPerBatch = Number(payload.unitsPerBatch);
    if (
      !payload.name ||
      !Number.isFinite(unitsPerBatch) ||
      unitsPerBatch <= 0
    ) {
      return sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid presentation input",
        },
      });
    }

    const created = {
      id: Math.max(0, ...recipe.presentations.map((item) => item.id)) + 1,
      name: payload.name,
      unitsPerBatch,
      salePrice:
        payload.salePrice === undefined || payload.salePrice === null
          ? null
          : Number(payload.salePrice),
      fixedCosts: [],
    };
    recipe.presentations.push(created);

    return sendJson(res, 201, toPresentationResponse(recipeId, created));
  }

  const presentationItemMatch = pathname.match(
    /^\/api\/recipes\/(\d+)\/presentations\/(\d+)$/,
  );

  if (presentationItemMatch && req.method === "PATCH") {
    recipeState.presentationAttempts += 1;
    const recipeId = Number(presentationItemMatch[1]);
    const presentationId = Number(presentationItemMatch[2]);
    const recipe = recipeById(recipeId);
    const target = recipe?.presentations.find(
      (presentation) => presentation.id === presentationId,
    );

    if (!recipe || !target) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Presentation not found" },
      });
    }

    const payload = JSON.parse(body || "{}");
    recipeState.lastPresentationPatch = payload;

    if (payload.name === SENTINEL_NAME) {
      return sendJson(res, 500, {
        error: { code: "INTERNAL", message: "Fallo simulado del servidor" },
      });
    }

    const unitsPerBatch = Number(payload.unitsPerBatch ?? target.unitsPerBatch);
    if (
      !payload.name ||
      !Number.isFinite(unitsPerBatch) ||
      unitsPerBatch <= 0
    ) {
      return sendJson(res, 400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid presentation input",
        },
      });
    }

    target.name = payload.name;
    target.unitsPerBatch = unitsPerBatch;
    // Igual que Hono: la clave ausente deja el precio como estaba.
    if (payload.salePrice !== undefined) {
      target.salePrice =
        payload.salePrice === null ? null : Number(payload.salePrice);
    }

    return sendJson(res, 200, toPresentationResponse(recipeId, target));
  }

  if (presentationItemMatch && req.method === "DELETE") {
    recipeState.presentationAttempts += 1;
    const recipeId = Number(presentationItemMatch[1]);
    const presentationId = Number(presentationItemMatch[2]);
    const recipe = recipeById(recipeId);
    const index =
      recipe?.presentations.findIndex((item) => item.id === presentationId) ??
      -1;

    if (!recipe || index === -1) {
      return sendJson(res, 404, {
        error: { code: "NOT_FOUND", message: "Presentation not found" },
      });
    }

    recipe.presentations.splice(index, 1);
    res.writeHead(204);
    return res.end();
  }

  // ── Fixtures QA de recetas (deterministas por test) ───────────────────────
  if (pathname === "/api/__qa/recipes/reset" && req.method === "POST") {
    recipeState = createRecipeState(JSON.parse(body || "{}"));
    return sendJson(res, 200, readRecipeState());
  }

  if (pathname === "/api/__qa/recipes/state" && req.method === "GET") {
    return sendJson(res, 200, readRecipeState());
  }

  // ── Fixtures QA de ingredientes (deterministas por test) ──────────────────
  if (pathname === "/api/__qa/ingredients/reset" && req.method === "POST") {
    ingredientState = createIngredientState(JSON.parse(body || "{}"));
    return sendJson(res, 200, readIngredientState());
  }

  if (pathname === "/api/__qa/ingredients/state" && req.method === "GET") {
    return sendJson(res, 200, readIngredientState());
  }

  // ── Fixture QA de cuenta, preferencias y billing (Task 11) ────────────────
  if (pathname === "/api/__qa/settings/reset" && req.method === "POST") {
    settingsState = createSettingsState();
    return sendJson(res, 200, readSettingsState());
  }

  if (pathname === "/api/__qa/settings/state" && req.method === "GET") {
    return sendJson(res, 200, readSettingsState());
  }

  // ── Casos del relay ───────────────────────────────────────────────────────
  if (pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      method: req.method,
      host: req.headers.host ?? null,
      path: url.pathname + url.search,
      cookie: req.headers.cookie ?? null,
      origin: req.headers.origin ?? null,
      referer: req.headers.referer ?? null,
      csrf: req.headers["x-csrf-token"] ?? null,
      secFetchSite: req.headers["sec-fetch-site"] ?? null,
    });
  }

  if (pathname === "/api/echo" && req.method === "POST") {
    return sendJson(res, 200, { received: body });
  }

  if (pathname === "/api/multi-cookie") {
    return sendJson(
      res,
      200,
      { cookies: 2 },
      {
        "set-cookie": [
          "alpha=1; Path=/; HttpOnly; SameSite=Lax",
          "beta=2; Path=/; HttpOnly; SameSite=Lax",
        ],
      },
    );
  }

  if (pathname === "/api/redirect") {
    res.writeHead(302, { location: "/api/health" });
    return res.end();
  }

  if (pathname === "/api/teapot") {
    return sendJson(res, 418, {
      error: {
        code: "DOMAIN_ERROR",
        message: "teapot",
        reason: "ingredient_in_use",
      },
    });
  }

  if (pathname === "/api/boom") {
    req.socket.destroy();
    return undefined;
  }

  return sendJson(res, 404, {
    error: { code: "NOT_FOUND", message: `stub sin ruta: ${pathname}` },
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[stub-api] listening on http://${HOST}:${PORT}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    // Las conexiones keep-alive del server de Nuxt mantendrían vivo el proceso
    // si sólo se cerrara el listener: se cortan y se fuerza la salida.
    server.closeAllConnections?.();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}
