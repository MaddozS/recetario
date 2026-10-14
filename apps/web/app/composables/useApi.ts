import { getCsrfToken } from '@recetario/auth/csrf-client';
import {
  apiFetch,
  MUTATING_METHODS,
  type ApiFetchImpl,
  type ApiFetchOptions,
} from '~/utils/api-client';
import { ApiError } from '~/utils/api-error';
import { CSRF_TOKEN_PATH, createCsrfEnsurer } from '~/utils/csrf';

/**
 * Cliente tipado universal de `/api/**`.
 *
 * - SSR: `useRequestFetch()` hereda las cookies del request entrante y resuelve
 *   por `localFetch`, sin salto de red, contra el relay same-origin.
 * - Cliente: mismo `$fetch`, con el token CSRF leído de la cookie.
 *
 * Un 401 invalida el estado de sesión y manda a `/sign-in` conservando la ruta
 * para que Task 6 explique lo ocurrido.
 */
export function useApi() {
  const requestFetch = useRequestFetch();
  const fetchImpl: ApiFetchImpl = async (path, init) => await requestFetch(path, init);

  // Sólo en el navegador: en SSR no hay cookie jar y el API exime las peticiones
  // sin `Origin` (la cookie emitida en el fetch del servidor no llegaría al
  // navegador y daría una falsa sensación de token).
  const ensureCsrfToken = import.meta.client
    ? createCsrfEnsurer({
        getToken: getCsrfToken,
        refresh: () => apiFetch(fetchImpl, CSRF_TOKEN_PATH),
      })
    : null;

  return async function apiRequest<T>(path: string, options: ApiFetchOptions<T> = {}): Promise<T> {
    const method = options.method ?? 'GET';

    if (ensureCsrfToken && MUTATING_METHODS.includes(method)) {
      await ensureCsrfToken();
    }

    const csrfToken = import.meta.client ? getCsrfToken() : null;
    const headers = { ...options.headers, ...csrfHeaderFor(method, csrfToken) };

    try {
      return await apiFetch<T>(fetchImpl, path, { ...options, headers });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await handleSessionExpired();
      }
      throw error;
    }
  };
}

async function handleSessionExpired(): Promise<void> {
  if (!import.meta.client) {
    // En SSR la navegación la decide la página o el middleware de ruta.
    return;
  }

  const { state, expire } = useAuth();
  if (state.value.status === 'authenticated') {
    expire();
  }

  const route = useRoute();
  if (route.path === '/sign-in') {
    return;
  }

  await navigateTo(
    {
      path: '/sign-in',
      query: { redirect: route.fullPath, reason: 'session_expired' },
    },
    { replace: true }
  );
}
