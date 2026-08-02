import { describe, it, expect, vi } from "vitest";
import { createVerificationEmailCallback } from "./verification-email-callback";

describe("createVerificationEmailCallback", () => {
  it("transforms API verify-email URL to web app URL", async () => {
    const sendEmail = vi.fn();
    const callback = createVerificationEmailCallback(sendEmail);
    const user = { email: "test@example.com" };
    // Better Auth generates URLs like http://localhost:8787/api/auth/verify-email
    const apiUrl = "http://localhost:8787/api/auth/verify-email?token=abc123&callbackURL=%2F";

    await callback({ user, url: apiUrl });

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Verifica tu email - KitchCalc",
      html: expect.stringContaining(
        "http://localhost:4321/verify-email?token=abc123&callbackURL=%2F",
      ),
    });
  });

  it("sends verification email with correct payload (unchanged URL)", async () => {
    const sendEmail = vi.fn();
    const callback = createVerificationEmailCallback(sendEmail);
    const user = { email: "test@example.com" };
    const url = "https://example.com/verify?token=abc123";

    await callback({ user, url });

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Verifica tu email - KitchCalc",
      html: expect.stringContaining(url),
    });
  });

  it("logs error and does not rethrow when sendEmail fails", async () => {
    const sendEmail = vi.fn().mockRejectedValue(new Error("email failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const callback = createVerificationEmailCallback(sendEmail);

    await expect(
      callback({ user: { email: "test@example.com" }, url: "https://example.com" }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[AUTH] sendVerificationEmail failed:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
