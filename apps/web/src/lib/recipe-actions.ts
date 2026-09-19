/**
 * Acciones de receta: menú de opciones, toggle de edición y diálogos
 * de duplicar/eliminar.
 *
 * Manejo delegado a nivel de `document`, registrado una sola vez por
 * documento (guard en `<html>`). Sobrevive a los swaps de contenido
 * de la navegación suave sin necesidad de re-vincular por elemento,
 * ya que los listeners en `document` persisten entre swaps y el script
 * del componente no se re-ejecuta en esas navegaciones.
 */

import { bindDialogBackdrop } from "./dialog";

function closeAllMenus(): void {
  document.querySelectorAll<HTMLElement>("[data-card-menu]").forEach((menu) => {
    menu.classList.remove("card-menu-open");
    menu.classList.add("hidden");
    const trigger = document.querySelector(
      `[data-card-menu-trigger="${menu.id}"]`,
    );
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

function openMenu(trigger: HTMLElement): void {
  const menuId =
    trigger.dataset.cardMenuTrigger ||
    trigger.getAttribute("data-card-menu-trigger");
  if (!menuId) return;
  const menu = document.getElementById(menuId);
  if (!menu) return;

  const isOpen =
    menu.classList.contains("card-menu-open") &&
    !menu.classList.contains("hidden");

  closeAllMenus();

  if (!isOpen) {
    menu.classList.remove("hidden");
    menu.classList.add("card-menu-open");
    trigger.setAttribute("aria-expanded", "true");
  }
}

function openRecipeDialog(trigger: HTMLElement): void {
  const dialogId =
    trigger.dataset.openDuplicateDialog ||
    trigger.dataset.openDeleteDialog ||
    trigger.getAttribute("data-open-duplicate-dialog") ||
    trigger.getAttribute("data-open-delete-dialog");
  if (!dialogId) return;
  const dialog = document.getElementById(dialogId) as HTMLDialogElement | null;
  if (!dialog) return;

  bindDialogBackdrop(dialog);
  delete dialog.dataset.submitting;
  dialog
    .querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLTextAreaElement
    >("input, select, button, textarea")
    .forEach((el) => {
      el.disabled = false;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.readOnly = false;
      }
      el.style.pointerEvents = "";
    });

  if (!dialog.open) dialog.showModal();
}

export function setupRecipeActions(): void {
  if (document.documentElement.dataset.recipeActionsBound === "1") return;
  document.documentElement.dataset.recipeActionsBound = "1";

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const trigger = target.closest<HTMLElement>(
      "[data-card-menu-trigger], [data-edit-toggle-trigger], " +
        "[data-open-duplicate-dialog], [data-open-delete-dialog], " +
        "[data-close-duplicate-dialog], [data-close-delete-dialog]",
    );

    if (trigger) {
      if (trigger.matches("[data-card-menu-trigger]")) {
        e.preventDefault();
        e.stopPropagation();
        openMenu(trigger);
      } else if (trigger.matches("[data-edit-toggle-trigger]")) {
        e.preventDefault();
        e.stopPropagation();
        closeAllMenus();
        document.dispatchEvent(
          new CustomEvent("recipe:edit-toggle", { bubbles: true }),
        );
      } else if (
        trigger.matches("[data-open-duplicate-dialog]") ||
        trigger.matches("[data-open-delete-dialog]")
      ) {
        e.preventDefault();
        e.stopPropagation();
        closeAllMenus();
        openRecipeDialog(trigger);
      } else {
        e.preventDefault();
        const dialog = trigger.closest<HTMLDialogElement>("dialog");
        if (dialog && dialog.dataset.submitting !== "1" && dialog.open) {
          dialog.close();
        }
      }
      return;
    }

    if (!target.closest("[data-card-menu]")) {
      closeAllMenus();
    }
  });
}
