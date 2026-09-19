import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import type { AuthVariables } from "../middleware/auth";

const { mockChangePassword, mockChangeEmail, mockUpdateUserName, mockLogAuditEvent } =
  vi.hoisted(() => ({
    mockChangePassword: vi.fn(),
    mockChangeEmail: vi.fn(),
    mockUpdateUserName: vi.fn(),
    mockLogAuditEvent: vi.fn(),
  }));

vi.mock("@recetario/auth/server", async () => {
  // La política de contraseña es lógica real: sólo se mockea el borde de auth.
  const actual = await vi.importActual<typeof import("@recetario/auth/server")>(
    "@recetario/auth/server",
  );
  return {
    ...actual,
    auth: {
      api: {
        changePassword: (...args: unknown[]) => mockChangePassword(...args),
        changeEmail: (...args: unknown[]) => mockChangeEmail(...args),
      },
    },
  };
});

vi.mock("@recetario/db", () => ({
  updateUserName: (...args: unknown[]) => mockUpdateUserName(...args),
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

const {
  accountChangeEmailHandler,
  accountChangePasswordHandler,
  accountUpdateNameHandler,
} = await import("./handlers");

const userFixture = {
  id: "user-account-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
};

function buildApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.use("*", async (c, next) => {
    c.set("user", userFixture);
    await next();
  });
  app.post("/api/account/update-name", accountUpdateNameHandler());
  app.post("/api/account/change-password", accountChangePasswordHandler());
  app.post("/api/account/change-email", accountChangeEmailHandler());
  return app;
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return buildApp().request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("accountUpdateNameHandler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns the shaped name on success", async () => {
    mockUpdateUserName.mockResolvedValueOnce(undefined);
    const res = await postJson("/api/account/update-name", {
      firstName: "  Ada ",
      lastName: " Byron ",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ firstName: "Ada", lastName: "Byron" });
    expect(mockUpdateUserName).toHaveBeenCalledWith("user-account-1", {
      firstName: "Ada",
      lastName: "Byron",
    });
  });

  it("returns 400 on a non-JSON body", async () => {
    const res = await buildApp().request("/api/account/update-name", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not-json",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockUpdateUserName).not.toHaveBeenCalled();
  });

  it("returns 400 when a name is missing", async () => {
    const res = await postJson("/api/account/update-name", { firstName: "Ada" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockUpdateUserName).not.toHaveBeenCalled();
  });

  it("returns 500 with a Spanish message when persistence fails", async () => {
    mockUpdateUserName.mockRejectedValueOnce(new Error("db down"));
    const res = await postJson("/api/account/update-name", {
      firstName: "Ada",
      lastName: "Byron",
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).toBe("No se pudo actualizar el nombre.");
  });
});

describe("accountChangePasswordHandler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects a password that does not meet the policy without calling auth", async () => {
    const res = await postJson("/api/account/change-password", {
      currentPassword: "Temporal123!",
      newPassword: "corta1!",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("al menos 8 caracteres");
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("maps an invalid current password to Spanish copy", async () => {
    mockChangePassword.mockRejectedValueOnce(new Error("Invalid password"));
    const res = await postJson("/api/account/change-password", {
      currentPassword: "incorrecta",
      newPassword: "NuevaClave1!",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("La contraseña actual es incorrecta.");
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it("returns a generic Spanish error for other auth failures", async () => {
    mockChangePassword.mockRejectedValueOnce(new Error("boom"));
    const res = await postJson("/api/account/change-password", {
      currentPassword: "Temporal123!",
      newPassword: "NuevaClave1!",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("No se pudo cambiar la contraseña.");
  });

  it("changes the password and records the audit event", async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);
    mockLogAuditEvent.mockResolvedValueOnce(undefined);

    const res = await postJson("/api/account/change-password", {
      currentPassword: "Temporal123!",
      newPassword: "NuevaClave1!",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockChangePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          currentPassword: "Temporal123!",
          newPassword: "NuevaClave1!",
          revokeOtherSessions: false,
        },
      }),
    );
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-account-1", action: "password_change" }),
    );
  });
});

describe("accountChangeEmailHandler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 for an invalid email", async () => {
    const res = await postJson("/api/account/change-email", {
      newEmail: "no-es-un-email",
      currentPassword: "Temporal123!",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockChangeEmail).not.toHaveBeenCalled();
  });

  it("changes the email and records the audit event", async () => {
    mockChangeEmail.mockResolvedValueOnce(undefined);
    mockLogAuditEvent.mockResolvedValueOnce(undefined);

    const res = await postJson("/api/account/change-email", {
      newEmail: "nueva@example.com",
      currentPassword: "Temporal123!",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-account-1", action: "email_change" }),
    );
  });

  it("maps auth failures to a Spanish validation error", async () => {
    mockChangeEmail.mockRejectedValueOnce(new Error("Email already in use"));
    const res = await postJson("/api/account/change-email", {
      newEmail: "nueva@example.com",
      currentPassword: "Temporal123!",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("No se pudo cambiar el email.");
  });
});
