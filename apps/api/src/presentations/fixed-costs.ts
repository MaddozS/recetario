import type { Handler } from "hono";
import {
  presentationFixedCostCreateSchema,
  presentationFixedCostUpdateSchema,
} from "@recetario/types";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

export function presentationsFixedCostsCreateHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const pid = Number(c.req.param("pid"));
      if (!Number.isFinite(pid)) {
        throw new ApiError("NOT_FOUND", "Presentation not found");
      }

      const presentation = await prisma.recipePresentation.findFirst({
        where: { id: pid, recipe: { ownerId: session.user.id } },
        select: { id: true },
      });
      if (!presentation) {
        throw new ApiError("NOT_FOUND", "Presentation not found");
      }

      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
      }
      const parsed = presentationFixedCostCreateSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError("VALIDATION_ERROR", "Invalid fixed cost input");
      }

      const created = await prisma.presentationFixedCost.create({
        data: {
          presentationId: pid,
          name: parsed.data.name ?? "Costo Fijo",
          type: parsed.data.type,
          base: parsed.data.base,
          value: parsed.data.value,
        },
      });

      return c.json(
        {
          id: created.id,
          presentationId: created.presentationId,
          name: created.name,
          type: created.type,
          base: created.base,
          value: created.value,
        },
        201,
      );
    });
}

export function presentationsFixedCostsUpdateHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const pid = Number(c.req.param("pid"));
      const fcid = Number(c.req.param("fcid"));
      if (!Number.isFinite(pid) || !Number.isFinite(fcid)) {
        throw new ApiError("NOT_FOUND", "Fixed cost not found");
      }

      const fc = await prisma.presentationFixedCost.findFirst({
        where: {
          id: fcid,
          presentationId: pid,
          presentation: { recipe: { ownerId: session.user.id } },
        },
        select: { id: true },
      });
      if (!fc) {
        throw new ApiError("NOT_FOUND", "Fixed cost not found");
      }

      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
      }
      const parsed = presentationFixedCostUpdateSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError("VALIDATION_ERROR", "Invalid fixed cost input");
      }

      const updated = await prisma.presentationFixedCost.update({
        where: { id: fcid },
        data: {
          ...(parsed.data.name !== undefined && { name: parsed.data.name }),
          ...(parsed.data.type !== undefined && { type: parsed.data.type }),
          ...(parsed.data.base !== undefined && { base: parsed.data.base }),
          ...(parsed.data.value !== undefined && { value: parsed.data.value }),
        },
      });

      return c.json({
        id: updated.id,
        presentationId: updated.presentationId,
        name: updated.name,
        type: updated.type,
        base: updated.base,
        value: updated.value,
      });
    });
}

export function presentationsFixedCostsDeleteHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const pid = Number(c.req.param("pid"));
      const fcid = Number(c.req.param("fcid"));
      if (!Number.isFinite(pid) || !Number.isFinite(fcid)) {
        throw new ApiError("NOT_FOUND", "Fixed cost not found");
      }

      const fc = await prisma.presentationFixedCost.findFirst({
        where: {
          id: fcid,
          presentationId: pid,
          presentation: { recipe: { ownerId: session.user.id } },
        },
        select: { id: true },
      });
      if (!fc) {
        throw new ApiError("NOT_FOUND", "Fixed cost not found");
      }

      await prisma.presentationFixedCost.delete({ where: { id: fcid } });
      return c.body(null, 204);
    });
}
