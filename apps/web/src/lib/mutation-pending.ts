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
  options?: { overlay?: boolean; message?: string },
): () => void {
  if (mutationPending) {
    return () => {}; // double-submit guard
  }
  mutationPending = true;

  const { overlay = false, message } = options ?? {};

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
    // Store original text for restoration
    if (submitter instanceof HTMLButtonElement && !submitter.dataset.origLabel) {
      submitter.dataset.origLabel = submitter.textContent ?? "";
      submitter.textContent = "Guardando…";
    }
    if (submitter instanceof HTMLInputElement && !submitter.dataset.origValue) {
      submitter.dataset.origValue = submitter.value;
      submitter.value = "Guardando…";
    }
  }

  return () => {
    // Restore submitter
    if (submitter) {
      submitter.disabled = false;
      submitter.removeAttribute("aria-busy");
      if (submitter instanceof HTMLButtonElement && submitter.dataset.origLabel) {
        submitter.textContent = submitter.dataset.origLabel;
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
