import { describe, it, expect, vi, beforeEach } from "vitest";
import { createResetPasswordCallback } from "./reset-password-callback";

const mockToken = "550e8400-e29b-41d4-a716-446655440000";

let mockCreatePasswordResetToken: ReturnType<typeof vi.fn>;
let mockGetResetPasswordEmailHtml: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockCreatePasswordResetToken = vi.fn().mockResolvedValue(mockToken);
  mockGetResetPasswordEmailHtml = vi.fn().mockReturnValue("<html>reset link</html>");
});

describe("createResetPasswordCallback", () => {
  it("sends reset email with correct payload on happy path", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          firstName: "Juan",
          name: "Juan Pérez",
        }),
      },
    };
    const sendEmail = vi.fn();
    const callback = createResetPasswordCallback(
      prisma, sendEmail, mockCreatePasswordResetToken, mockGetResetPasswordEmailHtml,
    );

    await callback({
      user: { id: "user-1", email: "juan@example.com" },
      url: "https://api.example.com/api/auth/reset-password/better-auth-token?callbackURL=https://example.com/reset",
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { firstName: true, name: true },
    });
    expect(mockCreatePasswordResetToken).toHaveBeenCalledWith("user-1", 10);
    expect(mockGetResetPasswordEmailHtml).toHaveBeenCalledWith(expect.objectContaining({
      resetLink: "https://api.example.com/reset-password?token=550e8400-e29b-41d4-a716-446655440000",
      userName: "Juan",
      expiryMinutes: 10,
    }));
    expect(sendEmail).toHaveBeenCalledWith({
      to: "juan@example.com",
      subject: "Restablece tu contraseña - KitchCalc",
      html: "<html>reset link</html>",
    });
  });

  it("falls back to usuario when no firstName or name", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          firstName: null,
          name: null,
        }),
      },
    };
    const sendEmail = vi.fn();
    const callback = createResetPasswordCallback(
      prisma, sendEmail, mockCreatePasswordResetToken, mockGetResetPasswordEmailHtml,
    );

    await callback({
      user: { id: "user-2", email: "anon@example.com" },
      url: "https://api.example.com/api/auth/reset-password/better-auth-token?callbackURL=%2F",
    });

    expect(mockGetResetPasswordEmailHtml).toHaveBeenCalledWith(expect.objectContaining({
      userName: "usuario",
    }));
  });

  it("uses locally-generated token instead of Better Auth token in URL", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ firstName: "Test", name: "Test" }),
      },
    };
    const sendEmail = vi.fn();
    const callback = createResetPasswordCallback(
      prisma, sendEmail, mockCreatePasswordResetToken, mockGetResetPasswordEmailHtml,
    );

    await callback({
      user: { id: "user-3", email: "test@example.com" },
      url: "https://api.example.com/api/auth/reset-password/better-auth-token?callbackURL=%2F",
    });

    expect(mockGetResetPasswordEmailHtml).toHaveBeenCalledWith(expect.objectContaining({
      resetLink: expect.stringContaining(mockToken),
    }));
    expect(mockGetResetPasswordEmailHtml).toHaveBeenCalledWith(expect.objectContaining({
      resetLink: expect.not.stringContaining("better-auth-token"),
    }));
    expect(mockGetResetPasswordEmailHtml).toHaveBeenCalledWith(expect.objectContaining({
      resetLink: expect.not.stringContaining("callbackURL"),
    }));
  });

  it("logs error when user lookup throws and does not rethrow", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockRejectedValue(new Error("db error")),
      },
    };
    const sendEmail = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const callback = createResetPasswordCallback(
      prisma, sendEmail, mockCreatePasswordResetToken, mockGetResetPasswordEmailHtml,
    );

    await expect(
      callback({
        user: { id: "user-4", email: "fail@example.com" },
        url: "https://api.example.com/api/auth/reset-password/better-auth-token?callbackURL=%2F",
      }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[AUTH] sendResetPassword failed:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("logs error when email dispatch throws and does not rethrow", async () => {
    const sendEmail = vi.fn().mockRejectedValue(new Error("email failed"));
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ firstName: "Test", name: "Test" }),
      },
    };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const callback = createResetPasswordCallback(
      prisma, sendEmail, mockCreatePasswordResetToken, mockGetResetPasswordEmailHtml,
    );

    await expect(
      callback({
        user: { id: "user-5", email: "fail@example.com" },
        url: "https://api.example.com/api/auth/reset-password/better-auth-token?callbackURL=%2F",
      }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[AUTH] sendResetPassword failed:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
