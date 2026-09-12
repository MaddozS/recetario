/**
 * Resuelve la sesión del request en el arranque de la app, para que el shell y
 * la apariencia estén disponibles incluso en rutas que no ejecutan el guard de
 * `auth`. `resolveSession()` es idempotente: si el middleware de Nitro ya dejó
 * el estado en el request, no vuelve a llamar al API.
 */
export default defineNuxtPlugin(async () => {
  const { resolveSession } = useAuth();
  await resolveSession();
});
