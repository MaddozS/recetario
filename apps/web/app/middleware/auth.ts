/**
 * Rutas privadas: sin sesión se vuelve a `/sign-in` conservando el destino y el
 * motivo (`auth_required`), que Task 6 renderiza como explicación.
 *
 * Síncrono a propósito: el estado ya viene resuelto desde el request (SSR) o
 * desde el payload (cliente), y un `await` aquí rompería el render.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated.value) {
    return;
  }

  return navigateTo(
    {
      path: "/sign-in",
      query: { redirect: to.fullPath, reason: "auth_required" },
    },
    { replace: true },
  );
});
