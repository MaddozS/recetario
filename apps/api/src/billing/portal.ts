import type { Handler } from "hono";
import { validateCsrf } from "@recetario/auth/server";
import { getStripeCustomerId } from "@recetario/db";
import { createPortalSession } from "@recetario/stripe/server";
import type { AuthVariables } from "../middleware/auth";
import { getAppOrigin } from "../url-utils";

export function stripePortalHandler(): Handler<{ Variables: AuthVariables }> {
  return async (c) => {
    const user = c.get("user");
    if (!validateCsrf(c.req.raw)) {
      return c.json({ error: "CSRF validation failed" }, 403);
    }

    const customerId = await getStripeCustomerId(user.id);
    if (!customerId) return c.json({ error: "No subscription found" }, 404);
    const appOrigin = getAppOrigin(c);
    const portalSession = await createPortalSession(
      customerId,
      `${appOrigin}/settings/billing`,
    );
    return c.json({ url: portalSession.url });
  };
}
