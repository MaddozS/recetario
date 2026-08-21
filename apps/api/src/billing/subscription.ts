import type { Handler } from "hono";
import { reconcileSubscription } from "@recetario/stripe/server";
import { ApiError } from "../errors";
import { getAuthUser } from "../middleware/auth";

export function subscriptionHandler(): Handler {
  return async (c) => {
    const user = await getAuthUser(c);

    const subscription = await reconcileSubscription(user.id);
    if (!subscription) throw new ApiError("NOT_FOUND", "No active subscription");

    return c.json(subscription);
  };
}
