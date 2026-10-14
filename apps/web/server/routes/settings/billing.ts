/**
 * `/settings/billing` → `/settings?tab=billing` (301), preservando la query.
 *
 * Puerto exacto del redirect de `/settings/billing`: `tab` se escribe
 * primero y el resto de parámetros se conserva (excepto un `tab` entrante, que
 * se descarta). Al no existir ya la página, esta ruta es la única que atiende
 * el path: no hay render ni rebote en cliente.
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const target = new URL('/settings', url.origin);

  target.searchParams.set('tab', 'billing');
  for (const [key, value] of url.searchParams) {
    if (key !== 'tab') target.searchParams.append(key, value);
  }

  return sendRedirect(event, `${target.pathname}${target.search}`, 301);
});
