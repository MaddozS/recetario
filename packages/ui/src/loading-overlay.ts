/**
 * Creates a full-screen loading overlay with a spinner and message.
 * The `@keyframes sp` animation must exist in global CSS (src/styles/global.css).
 *
 * @param message - Optional message to display (default: "Procesando…")
 * @returns A cleanup function that removes the overlay and restores scroll
 */
export function showLoadingOverlay(message?: string): () => void {
  const text = message ?? "Procesando…";

  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)";
  overlay.innerHTML = `<div style="background:var(--color-card,#fff);border-radius:1rem;padding:2rem 2.5rem;display:flex;flex-direction:column;align-items:center;gap:0.75rem;box-shadow:0 20px 60px rgba(0,0,0,0.15)">
    <svg aria-hidden="true" style="animation:sp 0.7s linear infinite;width:28px;height:28px;color:var(--color-accent-600,#4f46e5)" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    <span style="font-size:0.875rem;font-weight:600;color:var(--color-foreground,#0f172a)">${escapeHtml(text)}</span>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  return function cleanup() {
    overlay.remove();
    document.body.style.overflow = "";
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
