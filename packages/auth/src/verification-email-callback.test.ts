import { describe, it, expect, vi } from "vitest";
import {
  createVerificationEmailCallback,
  getVerificationEmailHtml,
} from "./verification-email-callback";

describe("getVerificationEmailHtml", () => {
  it("renders email template with userName and verificationLink", () => {
    const html = getVerificationEmailHtml({
      verificationLink: "https://app.kitchcalc.com/verify-email?token=xyz",
      userName: "María",
    });

    expect(html).toContain("María");
    expect(html).toContain("https://app.kitchcalc.com/verify-email?token=xyz");
    expect(html).toContain("Confirma tu correo electrónico");
    expect(html).toContain("Verifica tu cuenta - KitchCalc");
    expect(html).toContain("Este enlace expirará en 24 horas.");
    expect(html).toContain("kitchcalc_logo.svg");
    expect(html).toContain("family=Outfit");
    expect(html).toContain("#eb5757");
  });

  it("defaults userName to 'usuario' when not provided", () => {
    const html = getVerificationEmailHtml({
      verificationLink: "https://app.kitchcalc.com/verify-email?token=xyz",
    });

    expect(html).toContain("¡Hola, <strong>usuario</strong>!");
  });
});

describe("createVerificationEmailCallback", () => {
  it("transforms API verify-email URL to web app URL", async () => {
    const sendEmail = vi.fn();
    const callback = createVerificationEmailCallback(sendEmail);
    const user = { email: "test@example.com", firstName: "Carlos" };
    // Better Auth generates URLs like http://localhost:8787/api/auth/verify-email
    const apiUrl = "http://localhost:8787/api/auth/verify-email?token=abc123&callbackURL=%2F";

    await callback({ user, url: apiUrl });

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Verifica tu cuenta - KitchCalc",
      html: expect.stringContaining(
        "http://localhost:4321/verify-email?token=abc123&callbackURL=%2F",
      ),
    });
    expect(sendEmail.mock.calls[0][0].html).toContain("Carlos");
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
      subject: "Verifica tu cuenta - KitchCalc",
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

