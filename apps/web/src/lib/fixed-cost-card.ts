import { bindDialogBackdrop } from "@/lib/dialog";
import { parseNumberInput } from "@/lib/form-utils";

/**
 * FixedCostCard custom element. Each card manages its own persistence:
 * create/update/delete are posted to the recipe page (JSON) and the card
 * applies the server response without reloading, mirroring how
 * presentation cards behave. Cards are independent of the recipe-wide
 * edit mode — they can be added, edited and removed at any time.
 *
 * Imported by both FixedCostCard.astro and RecipeFixedCosts.astro so the
 * element is registered even when a recipe has no persisted fixed costs
 * (dynamically inserted create cards still upgrade).
 */
export class FixedCostCard extends HTMLElement {
  // Display elements
  displayContent: HTMLDivElement | null = null;
  editContent: HTMLDivElement | null = null;

  // Buttons
  btnEdit: HTMLButtonElement | null = null;
  btnDelete: HTMLButtonElement | null = null;
  btnEditDelete: HTMLButtonElement | null = null;
  btnCancel: HTMLButtonElement | null = null;

  // Inputs
  inputName: HTMLInputElement | null = null;
  selectType: HTMLSelectElement | null = null;
  selectBase: HTMLSelectElement | null = null;
  inputValue: HTMLInputElement | null = null;
  inputHours: HTMLInputElement | null = null;
  hoursField: HTMLDivElement | null = null;

  // Display values
  displayNameEl: HTMLSpanElement | null = null;
  displayValueEl: HTMLSpanElement | null = null;
  displayHoursEl: HTMLSpanElement | null = null;
  typeBadge: HTMLSpanElement | null = null;
  baseBadge: HTMLSpanElement | null = null;

  // Dialogs
  deleteDialog: HTMLDialogElement | null = null;
  btnDeleteCancel: HTMLButtonElement | null = null;
  btnDeleteConfirm: HTMLButtonElement | null = null;

  // Form
  form: HTMLFormElement | null = null;
  errorEl: HTMLParagraphElement | null = null;

  // State
  isEditing: boolean = false;
  isCreateMode: boolean = false;
  originalName: string = "";
  originalType: string = "";
  originalBase: string = "";
  originalValue: string = "0";
  originalHours: string = "1";
  escHandler: ((e: KeyboardEvent) => void) | null = null;
  errorDismissTimeout: number | undefined = undefined;

  connectedCallback() {
    if (this.dataset.bound === "1") return;
    this.dataset.bound = "1";

    this.displayContent =
      this.querySelector<HTMLDivElement>(".display-content");
    this.editContent = this.querySelector<HTMLDivElement>(".edit-content");

    this.btnEdit = this.querySelector<HTMLButtonElement>(".edit-btn");
    this.btnDelete = this.querySelector<HTMLButtonElement>(".delete-btn");
    this.btnEditDelete =
      this.querySelector<HTMLButtonElement>(".edit-delete-btn");
    this.btnCancel = this.querySelector<HTMLButtonElement>(".cancel-btn");

    this.inputName = this.querySelector<HTMLInputElement>(
      ".fixed-cost-name-input",
    );
    this.selectType = this.querySelector<HTMLSelectElement>(
      ".fixed-cost-type-select",
    );
    this.selectBase = this.querySelector<HTMLSelectElement>(
      ".fixed-cost-base-select",
    );
    this.inputValue = this.querySelector<HTMLInputElement>(
      ".fixed-cost-value-input",
    );
    this.inputHours = this.querySelector<HTMLInputElement>(
      ".fixed-cost-hours-input",
    );
    this.hoursField = this.querySelector<HTMLDivElement>(".hours-field");

    this.displayNameEl =
      this.querySelector<HTMLSpanElement>(".fixed-cost-name");
    this.displayValueEl =
      this.querySelector<HTMLSpanElement>(".fixed-cost-value");
    this.displayHoursEl =
      this.querySelector<HTMLSpanElement>(".fixed-cost-hours");
    this.typeBadge = this.querySelector<HTMLSpanElement>(".type-badge");
    this.baseBadge = this.querySelector<HTMLSpanElement>(".base-badge");

    this.deleteDialog =
      this.querySelector<HTMLDialogElement>(".delete-dialog");
    this.btnDeleteCancel =
      this.querySelector<HTMLButtonElement>(".delete-cancel-btn");
    this.btnDeleteConfirm = this.querySelector<HTMLButtonElement>(
      ".delete-confirm-btn",
    );

    this.form = this.querySelector<HTMLFormElement>("form");
    this.errorEl =
      this.querySelector<HTMLParagraphElement>(".fixed-cost-error");

    this.isCreateMode = this.dataset.mode === "create";

    if (this.isCreateMode) {
      // Start in edit mode
      this.displayContent?.classList.add("hidden");
      this.editContent?.classList.remove("hidden");
      this.isEditing = true;
    }
    this.btnEdit?.addEventListener("click", () => this.toggleEdit());
    this.btnCancel?.addEventListener("click", () => this.toggleEdit(false));
    this.btnDelete?.addEventListener("click", () => this.openDeleteDialog());
    this.btnEditDelete?.addEventListener("click", () =>
      this.openDeleteDialog(),
    );

    // Delete dialog
    this.btnDeleteCancel?.addEventListener("click", () =>
      this.closeDeleteDialog(),
    );
    this.btnDeleteConfirm?.addEventListener("click", () =>
      this.deleteFixedCost(),
    );

    // Base select change - toggle hours field visibility
    this.selectBase?.addEventListener("change", () =>
      this.toggleHoursField(),
    );

    // Escape key while editing
    this.escHandler = (e) => {
      if (e.key === "Escape" && this.isEditing) {
        this.toggleEdit(false);
      }
    };
    document.addEventListener("keydown", this.escHandler);

    // Bind dialog backdrop
    if (this.deleteDialog) {
      bindDialogBackdrop(this.deleteDialog);
    }

    // Form submission: create/update this fixed cost via the page POST
    // handler, then apply the server response (reload only on create,
    // since a new card has no display markup to update).
    this.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!this.form) return;

      if (!this.form.checkValidity()) {
        this.form.reportValidity();
        return;
      }

      const parsedValue = parseNumberInput(this.inputValue?.value ?? "");
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        this.showError("El valor debe ser un número mayor a 0.");
        return;
      }

      if (this.selectBase?.value === "PER_HOUR") {
        const parsedHours = parseNumberInput(this.inputHours?.value ?? "");
        if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
          this.showError("Las horas deben ser un número mayor a 0.");
          return;
        }
      }

      const submitBtn = this.form.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add("opacity-75", "cursor-not-allowed");
      }

      try {
        const formData = new FormData(this.form);
        // Hours only apply to PER_HOUR costs; drop the field otherwise
        // so the server does not persist a stray hours value.
        if (this.selectBase?.value !== "PER_HOUR") {
          formData.delete("hours");
        }
        const response = await fetch(window.location.href, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: formData,
        });

        if (response.redirected) {
          throw new Error(
            "Tu sesión expiró. Recarga la página e inicia sesión nuevamente.",
          );
        }

        if (!response.ok) {
          const message = (await response.text()).trim();
          throw new Error(message || "Hubo un error al guardar los cambios.");
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("La respuesta del servidor no fue válida.");
        }

        const payload = await response.json().catch(() => null);
        if (!payload?.fixedCost) {
          throw new Error("La respuesta del servidor no fue válida.");
        }

        if (this.isCreateMode) {
          // A create card has no display markup; reload to render the
          // fresh display card from the server.
          this.reloadTab();
        } else {
          this.applyFixedCost(payload.fixedCost);
          this.toggleEdit(true);
        }
        this.clearError();
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Hubo un error al guardar los cambios.";
        this.showError(message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove("opacity-75", "cursor-not-allowed");
        }
      }
    });
  }

  disconnectedCallback() {
    if (this.escHandler) {
      document.removeEventListener("keydown", this.escHandler);
      this.escHandler = null;
    }
  }

  reloadTab() {
    const ownerType = this.dataset.ownerType;
    const targetTab =
      ownerType === "presentation" ? "#presentaciones" : "#costos-fijos";
    const url = new URL(window.location.href);
    url.searchParams.delete("_fc");
    url.hash = targetTab;
    history.replaceState(null, "", url.toString());
    window.location.reload();
  }

  toggleEdit(save = false) {
    if (this.isCreateMode && !save) {
      this.remove();
      return;
    }
    this.isEditing = !this.isEditing;

    if (this.isEditing) {
      this.clearError();

      // Store originals
      this.originalName = this.inputName?.value || "";
      this.originalType = this.selectType?.value || "";
      this.originalBase = this.selectBase?.value || "";
      this.originalValue = this.inputValue?.value || "0";
      this.originalHours = this.inputHours?.value || "1";

      // Show edit content, hide display content
      this.displayContent?.classList.add("hidden");
      this.editContent?.classList.remove("hidden");

      if (this.btnEdit) {
        this.btnEdit.setAttribute("aria-pressed", "true");
        this.btnEdit.setAttribute("title", "Cancelar edición");
        this.btnEdit.setAttribute("aria-label", "Cancelar edición");
      }

      if (this.btnDelete) {
        this.btnDelete.classList.remove("hidden");
        this.btnDelete.classList.add("inline-flex");
      }
    } else {
      if (!save) {
        // Revert to original
        if (this.inputName) this.inputName.value = this.originalName;
        if (this.selectType) this.selectType.value = this.originalType;
        if (this.selectBase) this.selectBase.value = this.originalBase;
        if (this.inputValue) this.inputValue.value = this.originalValue;
        if (this.inputHours) this.inputHours.value = this.originalHours;
        this.toggleHoursField();
      }

      // Show display content, hide edit content
      this.displayContent?.classList.remove("hidden");
      this.editContent?.classList.add("hidden");

      if (this.btnEdit) {
        this.btnEdit.setAttribute("aria-pressed", "false");
        this.btnEdit.setAttribute("title", "Editar");
        this.btnEdit.setAttribute("aria-label", "Editar costo fijo");
      }

      if (this.btnDelete) {
        this.btnDelete.classList.add("hidden");
        this.btnDelete.classList.remove("inline-flex");
      }

      this.closeDeleteDialog();
    }
  }

  toggleHoursField() {
    const base = this.selectBase?.value || "";
    if (this.hoursField) {
      this.hoursField.style.display = base === "PER_HOUR" ? "flex" : "none";
    }
  }

  applyFixedCost(fixedCost: {
    name?: string;
    type?: string;
    base?: string;
    value?: number;
    hours?: number | null;
  }) {
    if (fixedCost.name !== undefined) {
      if (this.inputName) this.inputName.value = fixedCost.name;
      if (this.displayNameEl) this.displayNameEl.textContent = fixedCost.name;
    }
    if (fixedCost.type !== undefined) {
      if (this.selectType) this.selectType.value = fixedCost.type;
      if (this.typeBadge) {
        const labels: Record<string, string> = {
          PERCENTAGE: "Porcentaje",
          AMOUNT: "Monto",
        };
        this.typeBadge.textContent = labels[fixedCost.type] || fixedCost.type;

        const colors: Record<string, string> = {
          PERCENTAGE:
            "bg-turmeric-bg text-turmeric-solid border-turmeric-border",
          AMOUNT: "bg-accent-50 text-accent-600 border-accent-200",
        };
        this.typeBadge.className = `type-badge inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${colors[fixedCost.type] || colors.PERCENTAGE}`;
      }
      this.dataset.type = fixedCost.type;
    }
    if (fixedCost.base !== undefined) {
      if (this.selectBase) this.selectBase.value = fixedCost.base;
      if (this.baseBadge) {
        const labels: Record<string, string> = {
          PER_BATCH: "Por Mezcla",
          PER_UNIT: "Por Unidad",
          PER_HOUR: "Por Hora",
        };
        this.baseBadge.textContent = labels[fixedCost.base] || fixedCost.base;

        const colors: Record<string, string> = {
          PER_BATCH: "bg-herb-bg text-herb-solid border-herb-border",
          PER_UNIT: "bg-accent-50 text-accent-600 border-accent-200",
          PER_HOUR: "bg-chili-bg text-chili-solid border-chili-border",
        };
        this.baseBadge.className = `base-badge inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${colors[fixedCost.base] || colors.PER_BATCH}`;
      }
      this.toggleHoursField();
      this.dataset.base = fixedCost.base;
    }
    if (fixedCost.value !== undefined) {
      const val = Number(fixedCost.value);
      if (this.inputValue) this.inputValue.value = String(val);
      const type = this.selectType?.value || this.dataset.type || "AMOUNT";
      const display =
        type === "PERCENTAGE" ? `${val}%` : `$${val.toFixed(2)}`;
      if (this.displayValueEl) this.displayValueEl.textContent = display;
      this.dataset.value = String(val);
    }
    if (fixedCost.hours !== undefined) {
      const hrs = fixedCost.hours;
      if (this.inputHours)
        this.inputHours.value = hrs != null ? String(hrs) : "";
      if (this.displayHoursEl) {
        if (hrs != null) {
          this.displayHoursEl.textContent = `(${hrs}h)`;
          this.displayHoursEl.classList.remove("hidden");
        } else {
          this.displayHoursEl.classList.add("hidden");
        }
      }
      this.dataset.hours = hrs != null ? String(hrs) : "";
    }
  }

  showError(message: string) {
    if (!this.errorEl) return;
    if (this.errorDismissTimeout) {
      clearTimeout(this.errorDismissTimeout);
    }
    this.errorEl.textContent = message;
    this.errorEl.classList.remove("hidden");
  }

  clearError() {
    if (!this.errorEl) return;
    this.errorEl.classList.add("hidden");
    if (this.errorDismissTimeout) {
      clearTimeout(this.errorDismissTimeout);
      this.errorDismissTimeout = undefined;
    }
  }

  openDeleteDialog() {
    if (!(this.deleteDialog instanceof HTMLDialogElement)) return;
    if (!this.deleteDialog.open) {
      this.deleteDialog.showModal();
    }
  }

  closeDeleteDialog() {
    if (!(this.deleteDialog instanceof HTMLDialogElement)) return;
    if (
      this.deleteDialog.dataset.submitting === "1" ||
      this.deleteDialog.getAttribute("aria-busy") === "true"
    ) {
      return;
    }
    if (this.deleteDialog.open) {
      this.deleteDialog.close();
    }
  }

  async deleteFixedCost() {
    if (!this.form) return;

    if (this.deleteDialog) {
      this.deleteDialog.dataset.submitting = "1";
      this.deleteDialog.setAttribute("aria-busy", "true");
    }
    if (this.btnDeleteCancel) {
      this.btnDeleteCancel.disabled = true;
    }

    try {
      const formData = new FormData(this.form);
      formData.set("action", "delete_fixed_cost");

      const response = await fetch(window.location.href, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });

      if (response.redirected) {
        throw new Error(
          "Tu sesión expiró. Recarga la página e inicia sesión nuevamente.",
        );
      }

      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(
          message || "Hubo un error al eliminar el costo fijo.",
        );
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("La respuesta del servidor no fue válida.");
      }

      const payload = await response.json().catch(() => null);
      if (!payload?.deleted) {
        throw new Error("La respuesta del servidor no fue válida.");
      }

      this.remove();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Hubo un error al eliminar el costo fijo.";
      this.showError(message);
    } finally {
      if (this.deleteDialog) {
        delete this.deleteDialog.dataset.submitting;
        this.deleteDialog.removeAttribute("aria-busy");
      }
      if (this.btnDeleteCancel) {
        this.btnDeleteCancel.disabled = false;
      }
    }
  }
}

if (!customElements.get("fixed-cost-card")) {
  customElements.define("fixed-cost-card", FixedCostCard);
}
