
export const prerender = false; // Not needed in 'server' mode
import { auth } from "../../../lib/auth";
import type { APIRoute } from "astro";

export const ALL: APIRoute = async (ctx) => {
	const headers = new Headers(ctx.request.headers);

	if (!headers.has("x-forwarded-for") && ctx.clientAddress) {
		headers.set("x-forwarded-for", ctx.clientAddress);
	}

	return auth.handler(new Request(ctx.request, { headers }));
};

