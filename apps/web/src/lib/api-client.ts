import type { APIContext } from "astro";

export type ApiFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
};

function resolveBase(ctx: APIContext): { url: string } {
  const binding = ctx.locals.runtime?.env?.API;
  if (binding) {
    return { url: "service-binding" };
  }
  const devUrl = import.meta.env.INTERNAL_API_URL as string | undefined;
  if (!devUrl) {
    throw new Error(
      "No API binding in prod and no INTERNAL_API_URL in dev. Set INTERNAL_API_URL in apps/web/.dev.vars.",
    );
  }
  return { url: devUrl };
}

export async function apiFetch(
  ctx: APIContext,
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { url } = resolveBase(ctx);
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
  };
  if (url === "service-binding") {
    return ctx.locals.runtime.env.API!.fetch(path, init);
  }
  return fetch(`${url}${path}`, init);
}
