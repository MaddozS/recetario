import { relayApiRequest } from '../../utils/api-transport';

/**
 * Relay same-origin `/api/**` hacia el worker de Hono: el cliente nunca habla
 * con el API directamente, así las cookies de sesión son de primer origen y el
 * CSRF de Hono ve el `Origin`/`Referer` reales.
 */
export default defineEventHandler((event) => relayApiRequest(event));
