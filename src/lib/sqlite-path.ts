import { mkdirSync } from "node:fs";
import path from "node:path";

const isServerlessRuntime =
  process.env.VERCEL === "1" ||
  typeof process.env.LAMBDA_TASK_ROOT === "string" ||
  typeof process.env.AWS_LAMBDA_FUNCTION_NAME === "string";

export function resolveSqliteDatabasePath(configuredPath: string) {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  if (isServerlessRuntime) {
    return path.resolve("/tmp", configuredPath);
  }

  return path.resolve(process.cwd(), configuredPath);
}

export function prepareSqliteDatabasePath(configuredPath: string) {
  const resolvedPath = resolveSqliteDatabasePath(configuredPath);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });
  return resolvedPath;
}

export function usesEphemeralSqliteStorage() {
  return isServerlessRuntime;
}
