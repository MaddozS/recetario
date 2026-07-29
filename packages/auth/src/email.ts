export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailFn = (payload: EmailPayload) => Promise<void>;

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const useResend = process.env.RESEND_API_KEY;
  let resendFailed = false;

  if (useResend) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.SENDER_EMAIL ?? "noreply@kitchcalc.com",
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[EMAIL ERROR]", res.status, body);
        resendFailed = true;
      } else {
        return;
      }
    } catch (e) {
      console.error("[EMAIL ERROR]", e);
      resendFailed = true;
    }
  }

  if (!useResend || resendFailed) {
    console.log("[EMAIL STUB] To:", payload.to, "| Subject:", payload.subject);
    console.log("[EMAIL STUB] HTML:", payload.html.slice(0, 500));
  }
}
