import type { ZodIssue, ZodType } from "zod";
import type { ApiErrorCode, ApiErrorParsed } from "@recetario/types";
import { parseApiError } from "@recetario/types";

export type ApiFetchMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiFetchOptions<T> = {
  method?: ApiFetchMethod;
  body?: unknown;
  schema?: ZodType<T>;
  signal?: AbortSignal;
};

type ApiErrorExtras = Omit<ApiErrorParsed, "code" | "message" | "raw">;

type ServiceBinding = {
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
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
    extras: ApiErrorExtras = {},
    status: number = 500,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.issues = extras.issues;
    this.reason = extras.reason;
    this.traceId = extras.traceId;
    this.retryAfterMs = extras.retryAfterMs;
    this.status = status;
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
    let data: T;
    try {
      data = (await res.json()) as T;
    } catch {
      throw new ApiError("INTERNAL", "Internal error", {
        traceId: newTraceId(),
      });
    }
    return schema ? schema.parse(data) : data;
  }

  let parsed: ApiErrorParsed;
  try {
    parsed = await parseApiError(res);
  } catch {
    throw new ApiError("INTERNAL", "Internal error", {
      traceId: newTraceId(),
    });
  }
  throw new ApiError(
    parsed.code,
    parsed.message,
    {
      issues: parsed.issues,
      reason: parsed.reason,
      traceId: parsed.traceId ?? newTraceId(),
      retryAfterMs: parsed.retryAfterMs,
    },
    res.status,
  );
}
