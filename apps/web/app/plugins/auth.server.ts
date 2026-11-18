import { DEFAULT_ACCENT, DEFAULT_THEME } from '#shared/utils/preferences';
import { buildAnonymousAuthState } from '#shared/types/auth';

/**
 * Siembra el estado del request en el payload de Nuxt.
 *
 * **Sin `await`**: un `await` en la fase de creación de la app pierde el
 * contexto de Vue y el render siguiente rompe en los componentes que usan
 * `inject()` (`@lucide/vue`) — el primer render tras arrancar el server
 * devolvía 500 en cualquier página con íconos. La sesión ya la resolvió
 * `server/middleware/10.auth.ts`, así que aquí sólo se transporta.
 */
export default defineNuxtPlugin(() => {
  const state = useState('auth', () =>
    buildAnonymousAuthState({
      theme: DEFAULT_THEME,
      accentColor: DEFAULT_ACCENT,
    })
  );
  const event = useRequestEvent();

  if (event?.context.auth) {
    state.value = event.context.auth;
  }

  const appearance = useState('appearance', () => ({
    theme: state.value.preferences.theme,
    accentColor: state.value.preferences.accentColor,
  }));
  appearance.value = {
    theme: state.value.preferences.theme,
    accentColor: state.value.preferences.accentColor,
  };
});
