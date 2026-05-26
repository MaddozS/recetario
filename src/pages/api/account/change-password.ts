import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/db/audit";

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    return new Response("Missing fields", { status: 400 });
  }

  if (newPassword.length < 6) {
    return new Response("Password must be at least 6 characters", {
      status: 400,
    });
  }

  try {
    await auth.api.changePassword({
      headers: request.headers,
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
    });
    await logAuditEvent({
      userId: session.user.id,
      action: "password_change",
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent") ?? null,
    });
    return new Response(null, { status: 200 });
  } catch (error) {
    return new Response(
      (error as { message?: string })?.message ?? "Error changing password",
      { status: 400 },
    );
  }
};
