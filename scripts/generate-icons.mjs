#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ICONS_JSON = resolve(
  __dirname,
  "../node_modules/.pnpm/@iconify-json+lucide@1.2.107/node_modules/@iconify-json/lucide/icons.json",
);
const OUT_DIR = resolve(__dirname, "../packages/ui/src/icons");

const { icons, aliases } = JSON.parse(readFileSync(ICONS_JSON, "utf-8"));

function resolveIcon(name) {
  if (icons[name]) return icons[name];
  const alias = aliases[name];
  if (alias) {
    const parent = icons[alias.parent];
    if (parent) return parent;
    throw new Error(`icon "${name}": alias parent "${alias.parent}" not found`);
  }
  throw new Error(`icon "${name}" not found in icons or aliases`);
}

const NAMES = [
  "alert-triangle", "arrow-left", "arrow-up-circle", "bold",
  "book-open", "book-plus", "book-x", "calculator",
  "check", "check-circle", "chef-hat", "chevron-down",
  "chevron-left", "chevron-right", "clock", "cooking-pot",
  "copy", "credit-card", "dollar-sign", "ellipsis-vertical",
  "factory", "folder-open", "file-text", "folders",
  "heading", "info", "italic", "key-round",
  "list", "list-checks", "list-ordered", "list-tree",
  "lock", "log-out", "mail", "mail-check",
  "menu", "monitor", "moon", "move-horizontal",
  "package", "package-plus", "package-search", "palette",
  "pencil", "pie-chart", "plus", "printer",
  "save", "search", "search-x", "settings",
  "sun", "tag", "timer", "trash-2",
  "trending-down", "trending-up", "user", "x",
  "zap", "zoom-in",
];

function toPascalCase(name) {
  return name.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

mkdirSync(OUT_DIR, { recursive: true });

for (const name of NAMES) {
  const icon = resolveIcon(name);
  const content = [
    "---",
    "export interface Props {",
    "  [key: string]: unknown;",
    "  class?: string;",
    "  size?: number;",
    "}",
    "",
    "const { class: className, size = 24, ...rest } = Astro.props;",
    "---",
    "",
    '<svg',
    '  xmlns="http://www.w3.org/2000/svg"',
    '  viewBox="0 0 24 24"',
    '  fill="none"',
    '  stroke="currentColor"',
    '  stroke-width="2"',
    '  stroke-linecap="round"',
    '  stroke-linejoin="round"',
    "  width={size}",
    "  height={size}",
    "  class:list={[className]}",
    "  {...rest}",
    ">",
    "  " + icon.body,
    "</svg>",
    "",
  ].join("\n");
  writeFileSync(resolve(OUT_DIR, `${toPascalCase(name)}.astro`), content, "utf-8");
  console.log(`  ${toPascalCase(name)}.astro`);
}

console.log(`\nGenerated ${NAMES.length} icon components in ${OUT_DIR}`);
