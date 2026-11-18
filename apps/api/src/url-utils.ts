export interface RequestContext {
  req: {
    header: (name: string) => string | undefined;
    url: string;
  };
  env?: unknown;
}

export function getAppOrigin(c: RequestContext): string {
  const bindings = (c.env ?? {}) as Record<string, string | undefined>;
  const envOrigin =
    bindings.PUBLIC_APP_URL ||
    bindings.WEB_ORIGIN ||
    process.env.PUBLIC_APP_URL ||
    process.env.WEB_ORIGIN;
  if (envOrigin) {
    return envOrigin.replace(/\/$/, '');
  }

  const originHeader = c.req.header('origin') || c.req.header('referer');
  if (originHeader) {
    try {
      return new URL(originHeader).origin;
    } catch {
      // ignore
    }
  }

  return new URL(c.req.url).origin;
}

export function safeRedirectUrl(
  input: string | undefined,
  fallback: string,
  appOrigin: string
): string {
  if (!input) return fallback;

  if (input.startsWith('/') && !input.startsWith('//')) {
    return `${appOrigin}${input}`;
  }

  try {
    const parsed = new URL(input);
    if (parsed.origin === appOrigin) return input;
  } catch {
    // ignore
  }

  return fallback;
}
