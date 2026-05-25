import { auth } from "@/lib/auth";
import type { APIRoute } from "astro";
import { rateLimitCheck } from "@/lib/rate-limiter";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export const ALL: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "POST") {
    if (path.includes("/sign-in/email")) {
      const { allowed } = rateLimitCheck(
        `signin:${clientIp(request)}`,
        5,
        60,
      );
      if (!allowed) {
        return new Response("Too many sign-in attempts. Please try again later.", {
          status: 429,
        });
      }
    }

    if (path.includes("/sign-up/email")) {
      const { allowed } = rateLimitCheck(
        `signup:${clientIp(request)}`,
        3,
        3600,
      );
      if (!allowed) {
        return new Response("Too many sign-up attempts. Please try again later.", {
          status: 429,
        });
      }
    }
  }

  return auth.handler(request);
};
