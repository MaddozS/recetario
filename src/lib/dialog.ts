export function bindDialogBackdrop(dialog: HTMLDialogElement): void {
  if (dialog.dataset.backdropBound === "1") return;
  dialog.dataset.backdropBound = "1";
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
