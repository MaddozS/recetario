/**
 * Barrel de la capa de datos.
 *
 * Re-exporta todos los tipos, helpers y funciones CRUD
 * para que los consumidores puedan importar desde un
 * solo punto: `import { ... } from "./db"`.
 */
export * from "./types";
export * from "./helpers";
export * from "./connection";
export * from "./ingredients";
export * from "./recipes";
export * from "./presentations";
export * from "./preferences";
