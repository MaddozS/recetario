import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const clientPath = resolve("generated/prisma/client.ts");
const source = readFileSync(clientPath, "utf8");
const original =
  "globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))";
const replacement = [
  "const prismaClientDirname = typeof import.meta.url === 'string'",
  "  ? path.dirname(fileURLToPath(import.meta.url))",
  "  : '/'",
  "globalThis['__dirname'] = prismaClientDirname",
].join("\n");

if (source.includes(replacement)) {
  process.exit(0);
}

if (!source.includes(original)) {
  throw new Error("Prisma client dirname bootstrap changed; update patch script.");
}

writeFileSync(clientPath, source.replace(original, replacement));
