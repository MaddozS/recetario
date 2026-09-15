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
    badge: { text: "Mas popular", class: "bg-accent-600 text-white" },
    currency: "MXN",
    monthlyPriceId: "price_pro_monthly",
    monthlyDisplay: "$19.99",
    yearlyPriceId: "price_pro_yearly",
    yearlyDisplay: "$191.90",
    yearlyPerMonthDisplay: "$15.99",
    features: [{ text: "Recetas ilimitadas", included: true }],
  },
];

function sessionPayload({ plan }) {
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
    subscription: {
      ...SESSION_PAYLOAD.subscription,
      tier,
      recipesLimit: limits.recipes,
      ingredientsLimit: limits.ingredients,
      priceCents: tier === "free" ? null : tier === "basic" ? 999 : 1999,
      features,
    },
  };
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

/** ── Recetas (Task 8): estado en memoria, sin BD ───────────────────────── */

const SEED_RECIPES = [
  {
    id: 1,
    name: "Tarta de Chocolate",
    category: "Postres",
    ingredientCount: 3,
    updatedAt: "2026-09-14T10:00:00.000Z",
  },
  {
    id: 2,
    name: "Pan de Masa Madre",
    category: "Panes",
    ingredientCount: 2,
    updatedAt: "2026-09-13T10:00:00.000Z",
  },
  {
    id: 3,
    name: "Brownie Clásico",
    category: null,
    ingredientCount: 0,
    updatedAt: "2026-09-15T09:00:00.000Z",
  },
];

function createRecipeState(seed = {}) {
  return {
    recipes: (seed.recipes ?? SEED_RECIPES).map((item) => ({ ...item })),
    postAttempts: 0,
    deleteAttempts: 0,
  };
}

let recipeState = createRecipeState();

function readRecipeState() {
  return {
    recipes: recipeState.recipes.map((item) => ({ ...item })),
    postAttempts: recipeState.postAttempts,
    deleteAttempts: recipeState.deleteAttempts,
  };
}

/** Como Hono: las categorías nulas se omiten en la respuesta. */
function toRecipeSummaryResponse(recipe) {
  return {
    id: recipe.id,
    name: recipe.name,
    ...(recipe.category ? { category: recipe.category } : {}),
    ingredientCount: recipe.ingredientCount,
    ...(recipe.updatedAt ? { updatedAt: recipe.updatedAt } : {}),
  };
}

/** Detalle completo que devuelven crear y duplicar (`recipeWithIngredientsSchema`). */
function toRecipeDetailResponse(recipe) {
  return {
    ...toRecipeSummaryResponse(recipe),
    desiredMargin: 0,
    fixedCostsPercentage: 0,
    ingredients: [],
    presentations: [],
    recipeFixedCosts: [],
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
      authenticated ? sessionPayload({ plan: cookies["qa-plan"] }) : null,
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
    // Hono exige auth + doble-submit CSRF: el stub rechaza sin `x-csrf-token`
    // para que el e2e falle si el cliente no lo envía.
    if (!req.headers["x-csrf-token"]) {
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

    return sendJson(res, 200, { url: "/pricing?success=1" });
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

  // ── Recetas (Task 8) ──────────────────────────────────────────────────────
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
      ingredientCount: 0,
      updatedAt: new Date().toISOString(),
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
      ingredientCount: source.ingredientCount,
      updatedAt: new Date().toISOString(),
    };
    recipeState.recipes.push(copy);

    return sendJson(res, 201, toRecipeDetailResponse(copy));
  }

  const recipeMatch = pathname.match(/^\/api\/recipes\/(\d+)$/);

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
