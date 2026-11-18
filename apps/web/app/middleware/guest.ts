/**
 * Rutas de autenticación: una sesión viva no necesita verlas.
 */
export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated.value) {
    return navigateTo('/recipes');
  }
});
