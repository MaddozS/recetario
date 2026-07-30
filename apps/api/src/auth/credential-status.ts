import type { Handler } from "hono";
import { prisma } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { credentialStatusResponseSchema } from "@recetario/types";
import { ApiError } from "../errors";

export function credentialStatusHandler(): Handler {
  return async (c) => {
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
  };
}
