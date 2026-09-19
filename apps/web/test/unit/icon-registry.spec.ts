import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ICON_REGISTRY, getIcon } from "../../app/utils/icon-registry";

const APP_DIR = fileURLToPath(new URL("../../app", import.meta.url));

const STATIC_LUCIDE = /lucide:([a-z0-9-]+)/g;
// `icon="..."` sin prefijo: lo usan Button, SectionHeading y EmptyState.
const ICON_PROP = /icon="([a-z0-9-]+)"/g;

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return entry.isFile() && /\.(vue|ts)$/.test(entry.name) ? [path] : [];
  });
}

function findUsedIcons() {
  const used = new Map<string, string[]>();
  for (const file of collectSourceFiles(APP_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const pattern of [STATIC_LUCIDE, ICON_PROP]) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        const [, name] = match;
        const files = used.get(name) ?? [];
        if (!files.includes(file)) files.push(file);
        used.set(name, files);
      }
    }
  }
  return used;
}

describe("icon-registry", () => {
  it("resuelve con y sin el prefijo lucide:", () => {
    const withPrefix = getIcon("lucide:plus");
    expect(withPrefix).not.toBeNull();
    expect(getIcon("plus")).toBe(withPrefix);
    expect(getIcon("lucide:plus")?.name).toBe("plus");
  });

  it("devuelve null para un nombre desconocido", () => {
    expect(getIcon("lucide:no-existe")).toBeNull();
    expect(getIcon("lucide:")).toBeNull();
  });

  it("usa claves kebab-case y datos de ícono de lucide", () => {
    for (const [name, data] of Object.entries(ICON_REGISTRY)) {
      expect(name, `clave "${name}"`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(typeof data.name, `nombre de "${name}"`).toBe("string");
      expect(Array.isArray(data.node), `nodos de "${name}"`).toBe(true);
      expect(data.node.length, `nodos de "${name}"`).toBeGreaterThan(0);
      for (const [tag, attrs] of data.node) {
        expect(typeof tag, `tag de "${name}"`).toBe("string");
        expect(typeof attrs, `atributos de "${name}"`).toBe("object");
      }
    }
  });

  it("registra todo ícono usado en app/", () => {
    const used = findUsedIcons();
    expect(used.size).toBeGreaterThan(0);

    const missing = [...used.entries()]
      .filter(([name]) => !getIcon(name))
      .map(([name, files]) => `${name} (${files.join(", ")})`);

    expect(missing).toEqual([]);
  });
});
