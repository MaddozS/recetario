/**
 * Rutas privadas: sin sesión se vuelve a `/sign-in` conservando el destino y el
 * motivo (`auth_required`), que Task 6 renderiza como explicación.
 *
 * El guard resuelve la sesión por sí mismo (una sola vez por request) para no
 * depender del orden entre middlewares y plugins de Nuxt.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, resolveSession } = useAuth();
  await resolveSession();

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
