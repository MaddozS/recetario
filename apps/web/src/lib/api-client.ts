import type { ZodIssue, ZodType } from "zod";
import type { ApiErrorCode } from "@recetario/types";
import { parseApiError } from "@recetario/types";

export type ApiFetchMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiFetchOptions<T> = {
  method?: ApiFetchMethod;
  body?: unknown;
  schema?: ZodType<T>;
  signal?: AbortSignal;
};

type ServiceBinding = {
  fetch: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
};

const g = globalThis as typeof globalThis & {
  __recetarioApiBinding?: ServiceBinding;
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly issues?: ZodIssue[];
  readonly reason?: string;
  readonly traceId?: string;
  readonly retryAfterMs?: number;
  readonly status: number;

  constructor(
    code: ApiErrorCode,
    message: string,
    extras: {
      issues?: ZodIssue[];
      reason?: string;
      traceId?: string;
      retryAfterMs?: number;
      status?: number;
    } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.issues = extras.issues;
    this.reason = extras.reason;
    this.traceId = extras.traceId;
    this.retryAfterMs = extras.retryAfterMs;
    this.status = extras.status ?? 500;
  }
}

export function setApiBinding(binding: ServiceBinding | undefined): void {
  g.__recetarioApiBinding = binding;
}

function newTraceId(): string {
  return `web-${crypto.randomUUID()}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions<T>,
  astroRequest: Request,
): Promise<T> {
  const { method = "GET", body, schema, signal } = options;

  const headers: Record<string, string> = { accept: "application/json" };
  const cookie = astroRequest.headers.get("cookie");
  if (cookie) headers.cookie = cookie;

  const init: RequestInit = { method, headers, signal };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const binding = g.__recetarioApiBinding;
  let res: Response;
  if (binding) {
    res = await binding.fetch(path, init);
  } else {
    const base = import.meta.env.INTERNAL_API_URL as string | undefined;
    if (!base) {
      throw new Error(
        "No service binding and no INTERNAL_API_URL. Set INTERNAL_API_URL in apps/web/.dev.vars.",
      );
    }
    res = await fetch(`${base}${path}`, init);
  }

  if (res.ok) {
    const data = (await res.json()) as T;
    return schema ? schema.parse(data) : data;
  }

  const traceId = newTraceId();
  let parsed: Awaited<ReturnType<typeof parseApiError>>;
  try {
    parsed = await parseApiError(res);
  } catch {
    throw new ApiError("INTERNAL", "Internal error", {
      status: res.status,
      traceId,
    });
  }
  throw new ApiError(parsed.code, parsed.message, {
    issues: parsed.issues,
    reason: parsed.reason,
    traceId: parsed.traceId ?? traceId,
    retryAfterMs: parsed.retryAfterMs,
    status: res.status,
  });
}
