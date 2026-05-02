/**
 * Re-exporta la capa de datos desde `db/index.ts`.
 *
 * Este archivo existe para mantener compatibilidad con los imports
 * existentes que usan `from "../lib/recipe-data"`. Delega en el
 * barrel de `db/index.ts`.
 */
export * from "./db/index";
