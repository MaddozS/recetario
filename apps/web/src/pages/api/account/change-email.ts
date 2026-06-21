import type { APIRoute } from "astro";
import { auth } from "@recetario/auth";
import { logAuditEvent } from "@recetario/db";

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const newEmail = formData.get("newEmail") as string;
  const currentPassword = formData.get("currentPassword") as string;

  if (!newEmail || !currentPassword) {
    return new Response("Missing fields", { status: 400 });
  }

  try {
    await auth.api.changeEmail({
      headers: request.headers,
      body: { newEmail },
    });
    await logAuditEvent({
      userId: session.user.id,
      action: "email_change",
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent") ?? null,
    });
    return new Response(null, { status: 200 });
  } catch (error) {
    return new Response(
      (error as { message?: string })?.message ?? "Error changing email",
      { status: 400 },
    );
  }
};
