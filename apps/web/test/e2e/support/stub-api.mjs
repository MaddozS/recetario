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
    return sendJson(
      res,
      200,
      { user: SESSION_PAYLOAD.user },
      {
        "set-cookie": `better-auth.session_token=${SESSION_TOKEN}; Path=/; HttpOnly; SameSite=Lax`,
      },
    );
  }

  if (pathname === "/api/auth/sign-out" && req.method === "POST") {
    return sendJson(
      res,
      200,
      { success: true },
      {
        "set-cookie": "better-auth.session_token=; Path=/; Max-Age=0; SameSite=Lax",
      },
    );
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
