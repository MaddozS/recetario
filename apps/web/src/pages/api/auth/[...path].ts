import type { APIRoute } from "astro";
import { auth } from "@recetario/auth/server";

// ponytail: handle all /api/auth/* requests in the web app (Node.js),
// avoiding the API worker's WASM limitation in wrangler dev.
export const ALL: APIRoute = async ({ request }) => {
  return auth.handler(request);
};
