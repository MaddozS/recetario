import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockPrisma } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockFindFirstPresentation = vi.fn();
  const mockFindFirstFixedCost = vi.fn();
  const mockCreateFixedCost = vi.fn();
  const mockUpdateFixedCost = vi.fn();
  const mockDeleteFixedCost = vi.fn();
  const mockPrisma = {
    recipePresentation: { findFirst: mockFindFirstPresentation },
    presentationFixedCost: {
      findFirst: mockFindFirstFixedCost,
      create: mockCreateFixedCost,
      update: mockUpdateFixedCost,
      delete: mockDeleteFixedCost,
    },
  };
  return {
    mockGetSession,
    mockAuth,
    mockPrisma,
    mockFindFirstPresentation,
    mockFindFirstFixedCost,
    mockCreateFixedCost,
    mockUpdateFixedCost,
    mockDeleteFixedCost,
  };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  prisma: mockPrisma,
}));

const {
  presentationsFixedCostsCreateHandler,
  presentationsFixedCostsUpdateHandler,
  presentationsFixedCostsDeleteHandler,
} = await import("./fixed-costs.js");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.post("/api/presentations/:pid/fixed-costs", presentationsFixedCostsCreateHandler());
  app.patch("/api/presentations/:pid/fixed-costs/:fcid", presentationsFixedCostsUpdateHandler());
  app.delete("/api/presentations/:pid/fixed-costs/:fcid", presentationsFixedCostsDeleteHandler());
  return app;
}

describe("presentationsFixedCostsCreateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockPrisma.recipePresentation.findFirst.mockReset();
    mockPrisma.presentationFixedCost.create.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/presentations/5/fixed-costs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "AMOUNT", base: "PER_BATCH", value: 5 }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the presentation is not owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipePresentation.findFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/presentations/99/fixed-costs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "AMOUNT", base: "PER_BATCH", value: 5 }),
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.presentationFixedCost.create).not.toHaveBeenCalled();
  });

  it("creates a fixed cost on an owned presentation", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipePresentation.findFirst.mockResolvedValueOnce({ id: 5 });
    mockPrisma.presentationFixedCost.create.mockResolvedValueOnce({
      id: 7,
      presentationId: 5,
      name: "Empaque",
      type: "AMOUNT",
      base: "PER_UNIT",
      value: 1.5,
    });

    const res = await buildApp().request("/api/presentations/5/fixed-costs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Empaque", type: "AMOUNT", base: "PER_UNIT", value: 1.5 }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; presentationId: number; name: string };
    expect(body.id).toBe(7);
    expect(body.presentationId).toBe(5);
  });

  it("returns 400 on invalid body", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipePresentation.findFirst.mockResolvedValueOnce({ id: 5 });

    const res = await buildApp().request("/api/presentations/5/fixed-costs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "AMOUNT" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("presentationsFixedCostsUpdateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockPrisma.presentationFixedCost.findFirst.mockReset();
    mockPrisma.presentationFixedCost.update.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/presentations/5/fixed-costs/7", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the fixed cost is not owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.presentationFixedCost.findFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/presentations/5/fixed-costs/7", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.presentationFixedCost.update).not.toHaveBeenCalled();
  });

  it("updates a fixed cost on an owned presentation", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.presentationFixedCost.findFirst.mockResolvedValueOnce({ id: 7 });
    mockPrisma.presentationFixedCost.update.mockResolvedValueOnce({
      id: 7,
      presentationId: 5,
      name: "Empaque mod",
      type: "AMOUNT",
      base: "PER_UNIT",
      value: 2,
    });

    const res = await buildApp().request("/api/presentations/5/fixed-costs/7", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Empaque mod", value: 2 }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.presentationFixedCost.update).toHaveBeenCalled();
  });

  it("returns 400 when the body has no fields", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.presentationFixedCost.findFirst.mockResolvedValueOnce({ id: 7 });

    const res = await buildApp().request("/api/presentations/5/fixed-costs/7", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe("presentationsFixedCostsDeleteHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockPrisma.presentationFixedCost.findFirst.mockReset();
    mockPrisma.presentationFixedCost.delete.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/presentations/5/fixed-costs/7", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the fixed cost is not owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.presentationFixedCost.findFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/presentations/5/fixed-costs/7", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.presentationFixedCost.delete).not.toHaveBeenCalled();
  });

  it("deletes a fixed cost on an owned presentation", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.presentationFixedCost.findFirst.mockResolvedValueOnce({ id: 7 });
    mockPrisma.presentationFixedCost.delete.mockResolvedValueOnce({ id: 7 });

    const res = await buildApp().request("/api/presentations/5/fixed-costs/7", {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    expect(mockPrisma.presentationFixedCost.delete).toHaveBeenCalledWith({
      where: { id: 7 },
    });
  });
});
