// Public, stateless surface. Intentionally does NOT re-export from `./server.js`
// (which loads `./auth.js` → `@recetario/db` → Prisma + WASM query compiler).
// Apps that only need stateless helpers (CSRF, password rules, sign-in/up
// helpers, client) can import from the main entry; only code that actually
// owns a session (e.g. the API worker) imports from `@recetario/auth/server`.

export {
  generateToken,
  getCsrfCookie,
  getCsrfHeader,
  getCsrfFormField,
  setCsrfCookieHeader,
  extractCsrfCookie,
  getTrustedOrigins,
  resolveRequestOrigin,
  validateCsrf,
} from "./csrf";

export {
  validatePassword,
  getRuleResults,
  PASSWORD_RULES,
  PASSWORD_REGEX,
} from "./password-validation";
export type { PasswordRule, RuleResult } from "./password-validation";

export { authClient } from "./auth-client";
export { getCsrfToken } from "./csrf-client";
export { signInWithGoogle, signInWithEmail, signUpWithEmail, getSafeRedirect } from "./sign-in";
export { signOut } from "./sign-out";
