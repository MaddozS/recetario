import type { APIRoute } from "astro";
import { prisma } from "@recetario/db";

export const POST: APIRoute = async ({ request }) => {
  const session = await (
    await import("@recetario/auth")
  ).auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const firstName = (formData.get("firstName") as string)?.trim() ?? "";
  const lastName = (formData.get("lastName") as string)?.trim() ?? "";

  if (!firstName || !lastName) {
    return new Response("Missing fields", { status: 400 });
  }

  try {
    const fullName = `${firstName} ${lastName}`;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { firstName, lastName, name: fullName },
    });
    return new Response(null, { status: 200 });
  } catch {
    return new Response("Error updating name", { status: 500 });
  }
};
