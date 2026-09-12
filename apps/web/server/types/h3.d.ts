import type { AuthState } from "#shared/types/auth";

declare module "h3" {
  interface H3EventContext {
    /** Estado de sesión del request; lo escribe `server/middleware/10.auth.ts`. */
    auth?: AuthState;
  }
}
