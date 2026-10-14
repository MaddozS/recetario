import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Levanta el stub del API antes de los e2e y lo apaga al terminar. El build de
 * Nuxt apunta a `STUB_API_URL` (ver `playwright.config.ts`), así que los tests
 * del relay no tocan la BD ni dependen del worker real.
 */

export const STUB_API_PORT = 8788;
export const STUB_API_URL = `http://127.0.0.1:${STUB_API_PORT}`;

async function waitForStub(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${STUB_API_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // todavía no escucha
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`[stub-api] no respondió en ${STUB_API_URL}`);
}

export default async function globalSetup() {
  const script = fileURLToPath(new URL('./stub-api.mjs', import.meta.url));
  const child = spawn(process.execPath, [script], {
    stdio: 'inherit',
    env: { ...process.env, STUB_API_PORT: String(STUB_API_PORT) },
  });

  try {
    await waitForStub();
  } catch (error) {
    child.kill('SIGTERM');
    throw error;
  }

  // Playwright usa la función devuelta como global teardown. El SIGKILL es la
  // red de seguridad por si el stub no alcanza a cerrar por SIGTERM.
  return () => {
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 1_000).unref();
  };
}
