# Eliminate auth barrel duplication (index.ts ↔ server.ts)

> **Histórico (pre-Nuxt).** Documento de la etapa anterior a la migración a Nuxt (Task 13b): se conserva como registro, no como guía operativa, y las rutas o comandos que cita pueden no existir. Ver `docs/README.md`.

## Problem Statement

The `@recetario/auth` package has two barrel files that export a nearly identical set of symbols: `src/index.ts` (12 lines) and `src/server.ts` (30 lines). `server.ts` mirrors `index.ts` minus client-only exports (`authClient`, `getCsrfToken`, `signIn*`, `signOut`). Adding a new auth module requires editing both barrels, and the two barrels already differ in formatting style (index.ts uses compact one-liners, server.ts spells out each export individually). This is a maintenance burden with drift risk — a developer adding a server-safe module to `index.ts` might forget `server.ts`, causing a silent missing export.

## Solution

Make one barrel canonical. `server.ts` becomes the source of truth for server-safe exports; `index.ts` re-exports everything from `server.ts` plus the client-only modules. Adding a new server-side module only requires adding it to `server.ts`.

## User Stories

1. As a developer adding a new auth module, I want to export it by editing a single barrel file, so that I don't forget the other barrel and cause a client/worker missing-export bug.
2. As a developer importing from `@recetario/auth/server`, I want the same set of exports regardless of how the barrel is structured internally, so that the import interface is stable.
3. As a developer reviewing the auth package structure, I want the relationship between the two barrels to be explicit (one re-exports the other), so that the convention is obvious.

## Implementation Decisions

### Barrel relationship

`server.ts` remains the canonical barrel for all server-safe exports (auth, csrf, password-validation, password-reset, email).

`index.ts` re-exports everything from `server.ts` plus client-only modules (authClient, csrf-client, sign-in, sign-out):

```ts
export * from "./server.js";
export { authClient } from "./auth-client.js";
export { getCsrfToken } from "./csrf-client.js";
export { signInWithGoogle, signInWithEmail, signUpWithEmail, getSafeRedirect } from "./sign-in.js";
export { signOut } from "./sign-out.js";
```

This makes `index.ts` a strict superset of `server.ts` — every `server.ts` export is available through `index.ts`, but not vice versa.

### Why server.ts as canonical

`server.ts` is the smaller, more restrictive barrel. Making it canonical and having `index.ts` extend it is the natural dependency direction — the server-safe subset is the foundation; the universal barrel adds client-only exports on top.

### Export styles unified

`server.ts` currently uses verbose per-export lines (30 lines). After this change, its exact style is preserved — but since `index.ts` now re-exports via `export * from "./server.js"`, the verbose style exists only in `server.ts` and doesn't need to be duplicated.

## Testing Decisions

No test infrastructure exists. Verification is operational:
- Build `@recetario/auth` (`pnpm --filter @recetario/auth build`) and confirm no type errors.
- Verify `import { auth, validateCsrf } from "@recetario/auth/server"` resolves correctly in the Worker API.
- Verify `import { authClient, getCsrfToken, signInWithGoogle } from "@recetario/auth"` resolves correctly in the web app.
- Confirm the web app (auth, recipes, sign-in) and Worker API both function correctly.

## Out of Scope

- Changing which exports are server-safe vs client-only.
- Adding new export paths or restructuring the auth package beyond the barrel relationship.
- Moving any logic between modules — this is purely a barrel re-organization.
- Changing the `server.ts` export style to match `index.ts` or vice versa.

## Further Notes

This is Candidate #5 from the July 24, 2026 architecture review. It's the lowest-effort change — a 5-minute fix with zero behavioral impact. The `index.ts` file shrinks from 12 lines to 7 lines (including the `export *` and client-only additions). The `server.ts` file is unchanged.
