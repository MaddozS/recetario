/**
 * Calentamiento del server SSR.
 *
 * Hallazgo de la Task 4 (pre-existente, no introducido por el shell): el
 * **primer render** tras arrancar el proceso falla con
 * `Cannot destructure property 'size' of 'useLucideProps(...)' as it is
 * undefined` — los componentes de `@lucide/vue` llaman a `inject()` y en esa
 * primera pasada no encuentran instancia de Vue. Afecta a cualquier página con
 * íconos (incluido el design system de la Task 2) y desaparece a partir de la
 * tercera petición.
 *
 * Este helper absorbe esas peticiones para que la suite e2e mida el
 * comportamiento estable. El bug queda registrado como follow-up bloqueante
 * para el corte final (`docs/tasks/task-*-cloudflare-shell.md`).
 */
const SESSION_COOKIE = "better-auth.session_token=stub-session-token";

export async function warmUpSsr(
  baseUrl: string,
  attempts = 3,
): Promise<void> {
  const base = baseUrl.replace(/\/+$/, "");
  for (let attempt = 0; attempt < attempts; attempt++) {
    await fetch(`${base}/`).catch(() => undefined);
    await fetch(`${base}/recipes`, { headers: { cookie: SESSION_COOKIE } })
      .catch(() => undefined);
  }
}
