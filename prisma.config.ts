import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const url = env("DATABASE_URL") ?? process.env.DATABASE_URL ?? "";
const isSQLite = url.startsWith("file:");

export default defineConfig({
  schema: isSQLite ? "prisma/schema.sqlite.prisma" : "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
