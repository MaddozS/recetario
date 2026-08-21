import { Hono } from "hono";
import {
  auth,
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
} from "@recetario/db";
import { syncEnvBindings } from "@recetario/config/env";
import { clientIp, setSecurityHeaders } from "@recetario/config/request";

import { requireAuth, type AuthVariables } from "./middleware/auth";
import { envelope } from "./envelope";
import { errorHandler } from "./error-handler";
import { hostAllowlist } from "./host-allowlist";
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
import { stripeCheckoutHandler } from "./billing/checkout";
import { stripePortalHandler } from "./billing/portal";
import { stripeWebhookHandler } from "./billing/webhook";
import { syncCheckoutSessionHandler } from "./billing/sync-session";
import { credentialStatusHandler } from "./auth/credential-status";
import { auditLogHandler } from "./audit/log";
import { usageCountsHandler } from "./usage-counts";
import {
  presentationsFixedCostsCreateHandler,
  presentationsFixedCostsUpdateHandler,
  presentationsFixedCostsDeleteHandler,
} from "./presentations/fixed-costs";

import { getAppOrigin, safeRedirectUrl } from "./url-utils";

const app = new Hono<{ Variables: AuthVariables }>();


app.onError(errorHandler());
app.use("*", async (c, next) => {
  syncEnvBindings(c.env as Record<string, unknown>);
  await next();
  setSecurityHeaders(c.res);
});
app.use("*", envelope());
app.use("*", hostAllowlist());

app.use("*", async (c, next) => {
  const started = Date.now();
  await next();
  const elapsedMs = Date.now() - started;
  const level = elapsedMs > 5_000 ? "warn" : "log";
  console[level](
    `[API] ${c.req.method} ${new URL(c.req.url).pathname} -> ${c.res.status} in ${elapsedMs}ms`,
  );
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
        redirectTo: `${getAppOrigin(c)}/reset-password`,
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

// ── Protected routes middleware ───────────────────────────────────────────
app.use("/api/recipes/*", requireAuth());
app.use("/api/recipes", requireAuth());
app.use("/api/ingredients/*", requireAuth());
app.use("/api/ingredients", requireAuth());
app.use("/api/preferences/*", requireAuth());
app.use("/api/preferences", requireAuth());
app.use("/api/presentations/*", requireAuth());
app.use("/api/account/*", requireAuth());
app.use("/api/stripe/checkout", requireAuth());
app.use("/api/stripe/portal", requireAuth());
app.use("/api/stripe/sync-session", requireAuth());
app.use("/api/billing/subscription", requireAuth());
app.use("/api/usage-counts", requireAuth());
app.use("/api/auth/credential-status", requireAuth());
app.use("/api/audit/log", requireAuth());

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

app.all("/api/auth/*", async (c) => auth.handler(c.req.raw));

app.post("/api/account/update-name", async (c) => {
    const user = c.get("user");
    const formData = await c.req.raw.formData();
    const firstName = (formData.get("firstName") as string)?.trim() ?? "";
    const lastName = (formData.get("lastName") as string)?.trim() ?? "";

    if (!firstName || !lastName) return c.text("Missing fields", 400);

    try {
      await updateUserName(user.id, { firstName, lastName });
      return c.body(null, 200);
    } catch {
      return c.text("Error updating name", 500);
    }
  });

app.post("/api/account/change-email", async (c) => {
    const user = c.get("user");
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
        userId: user.id,
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
    const user = c.get("user");
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
        userId: user.id,
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

app.post("/api/stripe/checkout", stripeCheckoutHandler());
app.post("/api/stripe/portal", stripePortalHandler());
app.post("/api/stripe/sync-session", syncCheckoutSessionHandler());

app.post("/api/stripe/webhook", stripeWebhookHandler());

export default app;
