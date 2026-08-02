import { Hono } from "hono";
import {
  auth,
  rateLimitCheck,
  validateCsrf,
  validatePassword,
  validatePasswordResetToken,
  markTokenAsUsed,
  getRemainingSeconds,
  formatTime,
  hashPassword,
} from "@recetario/auth/server";
import {
  logAuditEvent,
  updateAccountPassword,
  updateUserName,
  stripe,
  seedSubscriptionPlans,
} from "@recetario/db";
import {
  getPlanByStripePriceId,
  getStripeCustomerId,
  getUserSubscription,
  createOrUpdateSubscription,
  cancelSubscription,
  markSubscriptionPastDue,
} from "@recetario/billing/server";
import { syncEnvBindings } from "@recetario/config/env";
import { clientIp, setSecurityHeaders } from "@recetario/config/request";

import { envelope } from "./envelope";
import { errorHandler } from "./error-handler";
import { hostAllowlist } from "./host-allowlist";
import { rateLimit } from "./rate-limit";
import { authSessionHandler } from "./auth-session";
import { recipesListHandler } from "./recipes/list";
import { recipesByIdsHandler } from "./recipes/by-ids";
import { recipesDetailHandler } from "./recipes/detail";
import { recipesCreateHandler } from "./recipes/create";
import { recipesUpdateHandler } from "./recipes/update";
import { recipesDeleteHandler } from "./recipes/delete";
import { recipesDuplicateHandler } from "./recipes/duplicate";
import {
  fixedCostsCreateHandler,
  fixedCostsUpdateHandler,
  fixedCostsDeleteHandler,
} from "./recipes/fixed-costs";
import { presentationsListHandler } from "./recipes/presentations";
import {
  presentationsCreateHandler,
  presentationsUpdateHandler,
  presentationsDeleteHandler,
} from "./recipes/presentations";
import { ingredientsListHandler } from "./ingredients/list";
import { ingredientsCreateHandler } from "./ingredients/create";
import { ingredientsUpdateHandler } from "./ingredients/update";
import { ingredientsDeleteHandler } from "./ingredients/delete";
import { ingredientsUsageHandler } from "./ingredients/usage";
import { ingredientsUsageBulkHandler } from "./ingredients/usage-bulk";
import { preferencesGetHandler } from "./preferences/get";
import { preferencesUpdateHandler } from "./preferences/update";
import { subscriptionHandler } from "./billing/subscription";
import { plansHandler } from "./billing/plans";
import { credentialStatusHandler } from "./auth/credential-status";
import { auditLogHandler } from "./audit/log";
import { usageCountsHandler } from "./usage-counts";
import {
  presentationsFixedCostsCreateHandler,
  presentationsFixedCostsUpdateHandler,
  presentationsFixedCostsDeleteHandler,
} from "./presentations/fixed-costs";

const app = new Hono();

function getPeriod(obj: unknown, field: string): number {
  if (obj && typeof obj === "object" && field in obj) {
    const val = (obj as Record<string, unknown>)[field];
    return typeof val === "number" ? val : 0;
  }
  return 0;
}

function safeRedirectUrl(
  input: string | undefined,
  fallback: string,
  appOrigin: string,
): string {
  if (!input) return fallback;
  if (input.startsWith("/") && !input.startsWith("//")) return input;

  try {
    const parsed = new URL(input);
    if (parsed.origin === appOrigin) return input;
  } catch {
    if (input.startsWith("/") && !input.startsWith("//")) return input;
  }

  return fallback;
}

app.onError(errorHandler());
app.use("*", envelope());
app.use("*", hostAllowlist());
app.use("*", rateLimit());
app.use("*", async (c, next) => {
  syncEnvBindings(c.env as Record<string, unknown>);
  await next();
  setSecurityHeaders(c.res);
});

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "recetario-api",
  }),
);

app.post("/api/auth/forgot-password", async (c) => {
  try {
    const body = await c.req.json();
    const email = body?.email as string | undefined;

    if (!email) {
      return c.json({ error: "Email requerido", code: "INVALID_DATA" }, 400);
    }

    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${new URL(c.req.url).origin}/reset-password`,
      },
    });
  } catch (error) {
    console.error("[AUTH] request-password-reset error:", error);
  }

  return c.json({
    success: true,
    message:
      "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
  });
});

app.get("/api/auth/reset-password", async (c) => {
    const token = new URL(c.req.url).searchParams.get("token");

    if (!token) {
      return c.json({ error: "Token requerido", code: "TOKEN_REQUIRED" }, 400);
    }

    try {
      const validation = await validatePasswordResetToken(token);

      if (!validation.valid) {
        const errorMessages = {
          not_found: "Enlace inválido o inexistente",
          expired: "El enlace ha expirado",
          used: "Este enlace ya fue utilizado",
        };

        return c.json({
          valid: false,
          error: errorMessages[validation.error || "not_found"],
          code: validation.error?.toUpperCase() || "INVALID_TOKEN",
        });
      }

      const remainingSeconds = await getRemainingSeconds(validation.expiresAt!);

      return c.json({
        valid: true,
        expiresAt: validation.expiresAt?.toISOString(),
        remainingSeconds,
        formattedTime: formatTime(remainingSeconds),
      });
    } catch (error) {
      console.error("[AUTH] validate-token error:", error);
      return c.json(
        { error: "Error al validar el enlace", code: "INTERNAL_ERROR" },
        500,
      );
    }
  });

app.post("/api/auth/reset-password", async (c) => {
    try {
      const body = await c.req.json();
      const token = body?.token as string | undefined;
      const password = body?.password as string | undefined;

      if (!token || !password) {
        return c.json(
          { error: "Token y contraseña son requeridos", code: "INVALID_DATA" },
          400,
        );
      }

      const validation = await validatePasswordResetToken(token);

      if (!validation.valid) {
        const errorMessages = {
          not_found: "Enlace inválido o inexistente",
          expired: "El enlace ha expirado",
          used: "Este enlace ya fue utilizado",
        };

        return c.json(
          {
            error: errorMessages[validation.error || "not_found"],
            code: validation.error?.toUpperCase() || "INVALID_TOKEN",
          },
          400,
        );
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return c.json(
          {
            error: "La contraseña no cumple los requisitos",
            code: "INVALID_PASSWORD",
            errors: passwordValidation.errors,
          },
          400,
        );
      }

      const hashedPassword = await hashPassword(password);
      await updateAccountPassword(
        validation.userId!,
        "credential",
        hashedPassword,
      );

      await markTokenAsUsed(token);

      await logAuditEvent(
        {
          userId: validation.userId!,
          action: "password_reset",
          ipAddress: clientIp(c.req.raw),
          userAgent: c.req.header("user-agent") ?? null,
        },
      );

      return c.json({
        success: true,
        message: "Contraseña actualizada correctamente",
      });
    } catch (error) {
      console.error("[AUTH] reset-password error:", error);
      return c.json(
        { error: "Error al restablecer la contraseña", code: "INTERNAL_ERROR" },
        500,
      );
    }
  });

app.get("/api/auth/session", authSessionHandler());

app.get("/api/recipes", recipesListHandler());
app.get("/api/recipes/by-ids", recipesByIdsHandler());
app.get("/api/recipes/:id", recipesDetailHandler());
app.post("/api/recipes", recipesCreateHandler());
app.patch("/api/recipes/:id", recipesUpdateHandler());
app.delete("/api/recipes/:id", recipesDeleteHandler());
app.post("/api/recipes/:id/duplicate", recipesDuplicateHandler());
app.post("/api/recipes/:id/fixed-costs", fixedCostsCreateHandler());
app.patch("/api/recipes/:id/fixed-costs/:fid", fixedCostsUpdateHandler());
app.delete("/api/recipes/:id/fixed-costs/:fid", fixedCostsDeleteHandler());
app.get("/api/recipes/:id/presentations", presentationsListHandler());
app.post("/api/recipes/:id/presentations", presentationsCreateHandler());
app.patch("/api/recipes/:id/presentations/:pid", presentationsUpdateHandler());
app.delete("/api/recipes/:id/presentations/:pid", presentationsDeleteHandler());
app.get("/api/ingredients", ingredientsListHandler());
app.post("/api/ingredients", ingredientsCreateHandler());
app.patch("/api/ingredients/:id", ingredientsUpdateHandler());
app.delete("/api/ingredients/:id", ingredientsDeleteHandler());
app.get("/api/ingredients/usage", ingredientsUsageBulkHandler());
app.get("/api/ingredients/:id/usage", ingredientsUsageHandler());
app.post("/api/audit/log", auditLogHandler());
app.get("/api/auth/credential-status", credentialStatusHandler());
app.post("/api/presentations/:pid/fixed-costs", presentationsFixedCostsCreateHandler());
app.patch("/api/presentations/:pid/fixed-costs/:fcid", presentationsFixedCostsUpdateHandler());
app.delete("/api/presentations/:pid/fixed-costs/:fcid", presentationsFixedCostsDeleteHandler());

app.get("/api/preferences", preferencesGetHandler());
app.put("/api/preferences", preferencesUpdateHandler());

app.get("/api/billing/subscription", subscriptionHandler());
app.get("/api/billing/plans", plansHandler());
app.get("/api/usage-counts", usageCountsHandler());

app.all("/api/auth/*", async (c) => {
    const path = new URL(c.req.url).pathname;
    const ip = clientIp(c.req.raw);

    if (c.req.method === "POST") {
      if (path.includes("/sign-in/email")) {
        const { allowed } = await rateLimitCheck(`signin:${ip}`, 5, 60);
        if (!allowed) {
          return c.text(
            "Too many sign-in attempts. Please try again later.",
            429,
          );
        }
      }

      if (path.includes("/sign-up/email")) {
        const { allowed } = await rateLimitCheck(`signup:${ip}`, 3, 3600);
        if (!allowed) {
          return c.text(
            "Too many sign-up attempts. Please try again later.",
            429,
          );
        }
      }

      if (path.includes("/sign-in/social")) {
        const { allowed } = await rateLimitCheck(`oauth:${ip}`, 10, 900);
        if (!allowed) {
          return c.text("Too many OAuth requests. Please try again later.", 429);
        }
      }

      if (path.includes("/forget-password")) {
        const { allowed } = await rateLimitCheck(`forgot:${ip}`, 3, 3600);
        if (!allowed) {
          return c.text("Too many reset requests. Please try again later.", 429);
        }
      }
    }

    return await auth.handler(c.req.raw);
  });

app.post("/api/account/update-name", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.text("Unauthorized", 401);

    const formData = await c.req.raw.formData();
    const firstName = (formData.get("firstName") as string)?.trim() ?? "";
    const lastName = (formData.get("lastName") as string)?.trim() ?? "";

    if (!firstName || !lastName) return c.text("Missing fields", 400);

    try {
      await updateUserName(session.user.id, { firstName, lastName });
      return c.body(null, 200);
    } catch {
      return c.text("Error updating name", 500);
    }
  });

app.post("/api/account/change-email", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.text("Unauthorized", 401);

    const formData = await c.req.raw.formData();
    const newEmail = formData.get("newEmail") as string;
    const currentPassword = formData.get("currentPassword") as string;

    if (!newEmail || !currentPassword) return c.text("Missing fields", 400);

    try {
      await auth.api.changeEmail({
        headers: c.req.raw.headers,
        body: { newEmail },
      });
      await logAuditEvent({
        userId: session.user.id,
        action: "email_change",
        ipAddress: clientIp(c.req.raw),
        userAgent: c.req.header("user-agent") ?? null,
      });
      return c.body(null, 200);
    } catch (error) {
      return c.text(
        (error as { message?: string })?.message ?? "Error changing email",
        400,
      );
    }
  });

app.post("/api/account/change-password", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.text("Unauthorized", 401);

    const formData = await c.req.raw.formData();
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;

    if (!currentPassword || !newPassword) return c.text("Missing fields", 400);
    if (newPassword.length < 6) {
      return c.text("Password must be at least 6 characters", 400);
    }

    try {
      await auth.api.changePassword({
        headers: c.req.raw.headers,
        body: {
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        },
      });
      await logAuditEvent({
        userId: session.user.id,
        action: "password_change",
        ipAddress: clientIp(c.req.raw),
        userAgent: c.req.header("user-agent") ?? null,
      });
      return c.body(null, 200);
    } catch (error) {
      return c.text(
        (error as { message?: string })?.message ?? "Error changing password",
        400,
      );
    }
  });

app.post("/api/stripe/checkout", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (!validateCsrf(c.req.raw)) {
      return c.json({ error: "CSRF validation failed" }, 403);
    }

    let body: { priceId?: string; successUrl?: string; cancelUrl?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request body" }, 400);
    }

    const { priceId, successUrl, cancelUrl } = body;
    if (!priceId) return c.json({ error: "Missing priceId" }, 400);

    const plan = await getPlanByStripePriceId(priceId);
    if (!plan) return c.json({ error: "Invalid price ID" }, 400);

    const appOrigin = new URL(c.req.url).origin;
    const userId = session.user.id;
    const userEmail = session.user.email;
    const existingCustomerId = await getStripeCustomerId(userId);
    const customerId =
      existingCustomerId ??
      (
        await stripe.customers.create({
          email: userEmail ?? undefined,
          metadata: { userId },
        })
      ).id;

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 14,
      },
      success_url: safeRedirectUrl(
        successUrl,
        `${appOrigin}/settings/billing?success=1`,
        appOrigin,
      ),
      cancel_url: safeRedirectUrl(
        cancelUrl,
        `${appOrigin}/pricing?canceled=1`,
        appOrigin,
      ),
      metadata: {
        userId,
        planId: plan.id,
      },
    });

    return c.json({ url: checkoutSession.url });
  });

app.post("/api/stripe/portal", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (!validateCsrf(c.req.raw)) {
      return c.json({ error: "CSRF validation failed" }, 403);
    }

    const subscription = await getUserSubscription(session.user.id);
    if (!subscription?.stripeCustomerId) {
      return c.json({ error: "No subscription found" }, 404);
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${new URL(c.req.url).origin}/settings/billing`,
    });

    return c.json({ url: portalSession.url });
  });

app.post("/api/stripe/webhook", async (c) => {
    await seedSubscriptionPlans();

    const payload = await c.req.text();
    const signature = c.req.header("stripe-signature");

    if (!signature) return c.text("Missing stripe-signature header", 400);

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        (c.env as Record<string, string | undefined>).STRIPE_WEBHOOK_SECRET ??
          process.env.STRIPE_WEBHOOK_SECRET ??
          "",
      );
    } catch {
      console.error("Webhook signature verification failed");
      return c.text("Invalid signature", 400);
    }

    const obj = event.data.object as unknown as Record<string, unknown>;

    switch (event.type) {
      case "checkout.session.completed": {
        const metadata = obj.metadata as Record<string, string> | undefined;
        const customerId =
          typeof obj.customer === "string" ? obj.customer : null;
        const subscriptionId =
          typeof obj.subscription === "string" ? obj.subscription : null;

        if (!subscriptionId || !customerId) break;

        let sub: unknown;
        try {
          sub = await stripe.subscriptions.retrieve(subscriptionId);
        } catch {
          break;
        }

        await createOrUpdateSubscription({
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          userId: metadata?.userId ?? null,
          planId: metadata?.planId ?? null,
          status: (sub as Record<string, unknown>).status as string,
          currentPeriodStart: new Date(
            getPeriod(sub, "current_period_start") * 1000,
          ),
          currentPeriodEnd: new Date(
            getPeriod(sub, "current_period_end") * 1000,
          ),
          cancelAtPeriodEnd: Boolean(
            (sub as Record<string, unknown>).cancel_at_period_end,
          ),
          trialEnd: getPeriod(sub, "trial_end")
            ? new Date(getPeriod(sub, "trial_end") * 1000)
            : null,
        });
        break;
      }

      case "customer.subscription.updated": {
        const customerId =
          typeof obj.customer === "string" ? obj.customer : null;

        await createOrUpdateSubscription({
          stripeSubscriptionId: obj.id as string,
          stripeCustomerId: customerId ?? "",
          userId: null,
          planId: null,
          status: obj.status as string,
          currentPeriodStart: new Date(
            getPeriod(obj, "current_period_start") * 1000,
          ),
          currentPeriodEnd: new Date(
            getPeriod(obj, "current_period_end") * 1000,
          ),
          cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end),
          trialEnd: getPeriod(obj, "trial_end")
            ? new Date(getPeriod(obj, "trial_end") * 1000)
            : null,
        });
        break;
      }

      case "customer.subscription.deleted": {
        await cancelSubscription(obj.id as string);
        break;
      }

      case "invoice.payment_failed": {
        const subscriptionId =
          typeof obj.subscription === "string" ? obj.subscription : null;

        if (subscriptionId)
          await markSubscriptionPastDue(subscriptionId);
        break;
      }
    }

    return c.text("OK");
  });

export default app;
