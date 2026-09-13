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
  const isPro = plan !== "free";
  return {
    ...SESSION_PAYLOAD,
    subscription: {
      ...SESSION_PAYLOAD.subscription,
      tier: isPro ? "pro" : "free",
      recipesLimit: isPro ? null : 10,
      ingredientsLimit: isPro ? null : 30,
      priceCents: isPro ? 1999 : null,
      features: {
        production_planner: isPro,
        recipe_duplicate: isPro,
        advanced_costs: isPro,
      },
    },
  };
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
