/**
 * Mutation pending feedback — prevents double-submit, shows busy
 * state on controls, and applies progress bar or overlay depending
 * on whether the action is redirect-heavy.
 */

let mutationPending = false;

export function isMutationPending(): boolean {
  return mutationPending;
}

/**
 * Begin mutation pending state. For redirect-heavy actions, shows a
 * blocking loading overlay. For inline operations, marks the submitter
 * button busy and shows the progress bar.
 *
 * Returns a cleanup function.
 */
export function startMutationPending(
  submitter?: HTMLButtonElement | HTMLInputElement | null,
  options?: { overlay?: boolean; message?: string; buttonText?: string },
): () => void {
  if (mutationPending) {
    return () => {}; // double-submit guard
  }
  mutationPending = true;

  const { overlay = false, message, buttonText } = options ?? {};

  let removeOverlay: (() => void) | null = null;

  if (overlay) {
    // Use the existing showLoadingOverlay pattern
    const overlayDiv = document.createElement("div");
    overlayDiv.id = "mutation-overlay";
    overlayDiv.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)";
    overlayDiv.innerHTML = `<div style="background:var(--color-card,#fff);border-radius:1rem;padding:2rem 2.5rem;display:flex;flex-direction:column;align-items:center;gap:0.75rem;box-shadow:0 20px 60px rgba(0,0,0,0.15)">
      <svg aria-hidden="true" style="animation:sp 0.7s linear infinite;width:28px;height:28px;color:var(--color-accent-600,#4f46e5)" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      <span style="font-size:0.875rem;font-weight:600;color:var(--color-foreground,#0f172a)">${message ?? "Procesando…"}</span>
      </div>`;
    document.body.appendChild(overlayDiv);
    document.body.style.overflow = "hidden";
    removeOverlay = () => {
      overlayDiv.remove();
      document.body.style.overflow = "";
    };
  } else {
    // Inline save: show progress bar + busy control
    const progressBar = document.getElementById("softnav-progress");
    if (progressBar) {
      progressBar.style.display = "block";
      const inner = progressBar.querySelector(".softnav-progress-inner") as HTMLElement | null;
      if (inner) {
        inner.style.transition = "none";
        inner.style.width = "0";
        void inner.offsetWidth;
        inner.style.transition = "width 8s cubic-bezier(0.1, 0.05, 0.2, 0.99)";
        inner.style.width = "85%";
      }
    }
  }

  if (submitter) {
    submitter.disabled = true;
    submitter.setAttribute("aria-busy", "true");
    // Store original text/html for restoration
    if (submitter instanceof HTMLButtonElement && !submitter.dataset.origLabel) {
      submitter.dataset.origLabel = submitter.innerHTML;
      const label = buttonText ?? (message ? message.replace(/…$/, "") : "Guardando");
      submitter.innerHTML = `<svg class="h-4 w-4 animate-[sp_0.7s_linear_infinite]" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>${label}…</span>`;
    }
    if (submitter instanceof HTMLInputElement && !submitter.dataset.origValue) {
      submitter.dataset.origValue = submitter.value;
      const label = buttonText ?? (message ? message.replace(/…$/, "") : "Guardando");
      submitter.value = `${label}…`;
    }
  }

  return () => {
    // Restore submitter
    if (submitter) {
      submitter.disabled = false;
      submitter.removeAttribute("aria-busy");
      if (submitter instanceof HTMLButtonElement && submitter.dataset.origLabel) {
        submitter.innerHTML = submitter.dataset.origLabel;
        delete submitter.dataset.origLabel;
      }
      if (submitter instanceof HTMLInputElement && submitter.dataset.origValue) {
        submitter.value = submitter.dataset.origValue;
        delete submitter.dataset.origValue;
      }
    }

    // Clear progress bar
    const progressBar = document.getElementById("softnav-progress");
    if (progressBar) {
      const inner = progressBar.querySelector(".softnav-progress-inner") as HTMLElement | null;
      if (inner) {
        inner.style.transition = "width 0.2s ease";
        inner.style.width = "100%";
        setTimeout(() => {
          if (!mutationPending) {
            progressBar.style.display = "none";
            inner.style.width = "0";
          }
        }, 200);
      } else {
        progressBar.style.display = "none";
      }
    }

    // Remove overlay
    if (removeOverlay) removeOverlay();

    mutationPending = false;
  };
}

export function clearNavProgressBar(): void {
  if (typeof document === "undefined") return;
  const bar = document.getElementById("nav-progress-bar");
  if (bar) {
    bar.style.width = "100%";
    setTimeout(() => {
      bar.style.opacity = "0";
      setTimeout(() => {
        bar.style.width = "0%";
      }, 300);
    }, 150);
  }
}

export function setupGlobalFormSubmitListener(): void {
  if (typeof document === "undefined") return;
  if (document.documentElement.dataset.globalSubmitBound === "1") return;
  document.documentElement.dataset.globalSubmitBound = "1";

  document.addEventListener("submit", (e) => {
    const form = e.target as HTMLFormElement | null;
    if (!form || e.defaultPrevented) return;

    const method = (form.getAttribute("method") || "GET").toUpperCase();
    if (method === "GET") {
      const bar = document.getElementById("nav-progress-bar");
      if (bar) {
        bar.style.transition = "width 8s cubic-bezier(0.1, 0.05, 0.2, 0.99), opacity 0.2s ease";
        bar.style.width = "75%";
        bar.style.opacity = "1";
      }
      return;
    }

    if (method !== "POST") return;

    const submitter =
      (e.submitter as HTMLButtonElement | HTMLInputElement | null) ||
      form.querySelector<HTMLButtonElement | HTMLInputElement>(
        'button[type="submit"], input[type="submit"], [data-submit-button]',
      ) ||
      (form.id
        ? document.querySelector<HTMLButtonElement | HTMLInputElement>(
            `button[form="${form.id}"], input[form="${form.id}"]`,
          )
        : null);

    const dialog =
      form.closest<HTMLDialogElement>("dialog") ||
      (submitter ? submitter.closest<HTMLDialogElement>("dialog") : null);
    const container = dialog || form;

    container.dataset.submitting = "1";

    container
      .querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLTextAreaElement
      >("input, select, button, textarea")
      .forEach((el) => {
        if (el instanceof HTMLButtonElement) {
          el.disabled = true;
        } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.readOnly = true;
          el.style.pointerEvents = "none";
        } else if (el instanceof HTMLSelectElement) {
          el.style.pointerEvents = "none";
        }
      });

    if (dialog) {
      dialog.addEventListener("cancel", (evt) => evt.preventDefault());
    }

    const actionVal =
      form.querySelector<HTMLInputElement>('input[name="action"]')?.value || "";

    let message = "Guardando cambios…";
    let buttonText = "Guardando…";

    if (actionVal.includes("create")) {
      if (actionVal.includes("recipe")) {
        message = "Creando receta…";
        buttonText = "Creando…";
      } else if (actionVal.includes("presentation")) {
        message = "Creando presentación…";
        buttonText = "Creando…";
      } else {
        message = "Agregando insumo…";
        buttonText = "Agregando…";
      }
    } else if (actionVal.includes("delete")) {
      if (actionVal.includes("recipe")) {
        message = "Eliminando receta…";
        buttonText = "Eliminando…";
      } else if (actionVal.includes("presentation")) {
        message = "Eliminando presentación…";
        buttonText = "Eliminando…";
      } else {
        message = "Eliminando insumo…";
        buttonText = "Eliminando…";
      }
    } else if (actionVal.includes("duplicate")) {
      message = "Duplicando receta…";
      buttonText = "Duplicando…";
    } else if (actionVal.includes("update") || actionVal.includes("save") || form.id === "recipe-edit-form") {
      if (actionVal.includes("recipe") || form.id === "recipe-edit-form") {
        message = "Guardando receta…";
        buttonText = "Guardando…";
      } else if (actionVal.includes("presentation")) {
        message = "Guardando presentación…";
        buttonText = "Guardando…";
      } else {
        message = "Guardando cambios…";
        buttonText = "Guardando…";
      }
    }

    startMutationPending(submitter, { overlay: true, message, buttonText });
  });

  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const trigger = target.closest<HTMLElement>(
      "a[data-astro-reload], a[href*='edit='], button[data-astro-reload]",
    );
    if (trigger) {
      const bar = document.getElementById("nav-progress-bar");
      if (bar) {
        bar.style.transition = "width 8s cubic-bezier(0.1, 0.05, 0.2, 0.99), opacity 0.2s ease";
        bar.style.width = "75%";
        bar.style.opacity = "1";
      }
    }
  });
}

