import { SIDEBAR_COOKIE, readCookie } from '#shared/utils/preferences';

/**
 * Estado de la sidebar de escritorio, persistido en cookie para que el SSR
 * pinte el ancho correcto sin parpadeo.
 *
 * Se lee de la cabecera `Cookie` (SSR) o de `document.cookie` (cliente) en vez
 * de `useCookie`: en este runtime `useCookie` no ve el request original.
 */
export function useSidebarCollapsed() {
  const collapsed = ref(
    import.meta.server
      ? readCookie(useRequestHeaders(['cookie']).cookie, SIDEBAR_COOKIE) === '1'
      : readDocumentCookie(SIDEBAR_COOKIE) === '1'
  );

  function setCollapsed(next: boolean): void {
    collapsed.value = next;
    if (import.meta.client) {
      writeDocumentCookie(SIDEBAR_COOKIE, next ? '1' : '0');
    }
  }

  return { collapsed, setCollapsed };
}
