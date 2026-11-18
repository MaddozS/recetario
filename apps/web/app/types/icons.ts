/** Nodos SVG de un ícono: `["path", { d: "…" }]`, `["circle", { cx, cy, r }]`, … */
export type LucideIconNode = [string, Record<string, string>];

/** Datos crudos de un ícono de lucide (`__iconData`). */
export interface LucideIconData {
  name: string;
  size: number;
  node: LucideIconNode[];
}
