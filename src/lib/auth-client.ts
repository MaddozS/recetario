import { createAuthClient } from "better-auth/client";

const baseURL =
  (typeof window !== "undefined" ? window.location.origin : undefined) ??
  import.meta.env.PUBLIC_BETTER_AUTH_URL ??
  "http://localhost:4321";

export const authClient = createAuthClient({
  baseURL,
});
