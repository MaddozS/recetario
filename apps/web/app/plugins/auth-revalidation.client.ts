import { createRefreshScheduler } from "~/utils/session-revalidation";

/**
 * Revalida la sesión cuando el snapshot del documento puede haber quedado
 * rancio: restauración desde bfcache (`pageshow` con `persisted`, sin request
 * ni SSR) y regreso a la pestaña (`visibilitychange`/`focus`, con TTL). La
 * carga inicial ya la resolvió el bootstrap del SSR, así que los listeners se
 * registran recién montada la app y se liberan al desmontarla.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { state, refresh } = useAuth();
  const scheduler = createRefreshScheduler({
    refresh,
    isEligible: () => state.value.status === "authenticated",
  });

  function onPageShow(event: PageTransitionEvent): void {
    // Sin `persisted` el documento acaba de crearse y el bootstrap del SSR ya
    // sembró la sesión; con él, el navegador restauró la página sin request.
    if (event.persisted) {
      void scheduler.request(true);
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === "visible") {
      void scheduler.request();
    }
  }

  function onFocus(): void {
    void scheduler.request();
  }

  nuxtApp.hook("app:mounted", () => {
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
  });

  nuxtApp.vueApp.onUnmount(() => {
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    scheduler.dispose();
  });
});
