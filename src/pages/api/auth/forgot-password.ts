import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = body?.email as string | undefined;

    if (!email) {
      return new Response(
        JSON.stringify({
          error: "Email requerido",
          code: "INVALID_DATA",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${new URL(request.url).origin}/reset-password`,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[AUTH] request-password-reset error:", error);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};