import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const clientPath = resolve("../../apps/api/generated/prisma/client.ts");
const source = readFileSync(clientPath, "utf8");
const original = "globalThis['__dirname'] = '/'";
const replacement = [
  "const prismaClientDirname = typeof import.meta.url === 'string'",
  "  ? new URL('.', import.meta.url).pathname",
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
