/**
 * Vincula el cierre de un `<dialog>` al hacer clic en el backdrop.
 *
 * Agrega un listener `click` que cierra el diálogo cuando el
 * usuario hace clic fuera de su contenido. Usa un data-attribute
 * (`data-backdrop-bound`) para evitar registrar el listener
 * más de una vez sobre el mismo elemento.
 *
 * Uso típico en páginas y componentes con modales `<dialog>`.
 *
 * @param dialog - El elemento `<dialog>` a vincular.
 */
export function bindDialogBackdrop(dialog: HTMLDialogElement): void {
  if (dialog.dataset.backdropBound === "1") return;
  dialog.dataset.backdropBound = "1";

  // Prevent closing via backdrop click when submitting or busy
  dialog.addEventListener("click", (event) => {
    if (
      dialog.dataset.submitting === "1" ||
      dialog.getAttribute("aria-busy") === "true"
    ) {
      return;
    }
    if (event.target === dialog) dialog.close();
  });

  // Prevent closing via ESC key when submitting or busy
  dialog.addEventListener("cancel", (event) => {
    if (
      dialog.dataset.submitting === "1" ||
      dialog.getAttribute("aria-busy") === "true"
    ) {
      event.preventDefault();
    }
  });
}
