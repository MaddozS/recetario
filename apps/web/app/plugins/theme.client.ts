/**
 * Mantiene sincronizada la preferencia del sistema con el estado reactivo. Los
 * atributos de `<html>` los aplica `app.vue` vía `useHead`; aquí no se toca el
 * DOM (el script anti-FOUC ya resolvió la clase antes del primer paint).
 */
export default defineNuxtPlugin(() => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return;
  }

  const { setPrefersDark } = useTheme();
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  setPrefersDark(media.matches);
  media.addEventListener("change", (event) => setPrefersDark(event.matches));
});
