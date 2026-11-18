/**
 * Rastrea el destino de la navegación en curso. El shell (`AppSidebar`,
 * `AppBottomNav`) lo compara con sus enlaces para mostrar el estado pendiente
 * en el mismo frame del click, sin depender de que la navegación resuelva.
 *
 * El estado se mantiene un mínimo visible: con datos `lazy` la ruta se resuelve
 * en decenas de milisegundos (lo que tarda es el dato, que ya tiene su propio
 * skeleton), así que sin ese mínimo el click no se percibiría. Es el mismo
 * criterio que el `hideDelay` del indicador de progreso de Nuxt.
 *
 * `afterEach` cubre el caso normal, `onError` las navegaciones que revientan y
 * `page:loading:end` las que se cancelan sin llegar a resolver.
 */

const MIN_VISIBLE_MS = 500;

export default defineNuxtPlugin((nuxtApp) => {
  const pending = useNavPending();
  const router = useRouter();

  // La navegación inicial no la dispara el usuario: marcarla como pendiente
  // atenuaría una sección del shell al cargar.
  let mounted = false;
  nuxtApp.hook('app:mounted', () => {
    mounted = true;
  });

  let startedAt = 0;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function start(path: string): void {
    if (!mounted) return;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    startedAt = Date.now();
    pending.value = path;
  }

  function finish(): void {
    if (!pending.value) return;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(
      () => {
        hideTimer = null;
        pending.value = null;
      },
      Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt))
    );
  }

  router.beforeEach((to, from) => {
    // Mismo destino: Vue Router la aborta como duplicada y no llega a
    // `afterEach`, así que no se marca nada.
    if (to.fullPath === from.fullPath) return;
    start(to.fullPath);
  });
  router.afterEach(finish);
  router.onError(finish);
  nuxtApp.hook('page:loading:end', finish);
});
