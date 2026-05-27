export function setupPasswordToggles() {
  document
    .querySelectorAll<HTMLButtonElement>("[data-pw-toggle]")
    .forEach((btn) => {
      if (btn.dataset.pwToggleBound === "1") return;
      btn.dataset.pwToggleBound = "1";
      btn.addEventListener("click", () => {
        const inputId = btn.dataset.pwToggle;
        if (!inputId) return;
        const input = document.getElementById(
          inputId,
        ) as HTMLInputElement | null;
        if (!input) return;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn
          .querySelector<HTMLElement>("[data-pw-eye]")
          ?.classList.toggle("hidden", !isPassword);
        btn
          .querySelector<HTMLElement>("[data-pw-eye-off]")
          ?.classList.toggle("hidden", isPassword);
        btn.setAttribute(
          "aria-label",
          isPassword ? "Ocultar contraseña" : "Mostrar contraseña",
        );
      });
    });
}
