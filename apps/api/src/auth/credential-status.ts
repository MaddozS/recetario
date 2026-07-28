import type { Handler } from "hono";
import { credentialStatusResponseSchema } from "@recetario/types";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

export function credentialStatusHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const credentialAccount = await prisma.account.findFirst({
        where: { userId: session.user.id, providerId: "credential" },
        select: { id: true },
      });
      return c.json(
        credentialStatusResponseSchema.parse({
          hasPasswordAuth: credentialAccount !== null,
        }),
      );
    });
}
