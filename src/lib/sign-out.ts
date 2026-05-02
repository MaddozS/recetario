import { authClient } from "./auth-client";

let pendingSignOut: Promise<void> | null = null;

async function startSignOut() {
  await authClient.signOut();
}

/**
 * Cierra la sesión del usuario actual.
 *
 * Deduplica llamadas concurrentes: si se invoca mientras un
 * cierre de sesión ya está en curso, retorna la misma promesa
 * en lugar de iniciar uno nuevo.
 */
const signOut = async () => {
  if (pendingSignOut) {
    return pendingSignOut;
  }

  pendingSignOut = startSignOut().finally(() => {
    pendingSignOut = null;
  });

  return pendingSignOut;
};

export { signOut };
