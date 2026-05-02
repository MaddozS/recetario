import { createAuthClient } from "better-auth/client";
const authClient = createAuthClient();

let pendingSocialSignIn: Promise<void> | null = null;

class SignInRateLimitError extends Error {
  retryAfterSeconds?: number;

  constructor(retryAfterSeconds?: number) {
    super("too_many_requests");
    this.name = "SignInRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseRetryAfterSeconds(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const retryAfterSeconds = Number.parseInt(value, 10);
  return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? retryAfterSeconds
    : undefined;
}

function getRetryAfterSecondsFromHeaders(headers?: Headers) {
  if (!headers) {
    return undefined;
  }

  return parseRetryAfterSeconds(
    headers.get("x-retry-after") ?? headers.get("retry-after")
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStatusCode(error: unknown) {
  if (!isObject(error)) {
    return undefined;
  }

  if (typeof error.status === "number") {
    return error.status;
  }

  if (isObject(error.response) && typeof error.response.status === "number") {
    return error.response.status;
  }

  return undefined;
}

function getRetryAfterSeconds(error: unknown) {
  if (!isObject(error)) {
    return undefined;
  }

  if (error.headers instanceof Headers) {
    return getRetryAfterSecondsFromHeaders(error.headers);
  }

  if (isObject(error.response) && error.response.headers instanceof Headers) {
    return getRetryAfterSecondsFromHeaders(error.response.headers);
  }

  return undefined;
}

async function startSocialSignIn() {
  let responseStatus: number | undefined;
  let retryAfterSeconds: number | undefined;

  try {
    await authClient.signIn.social({
      provider: "google",
      fetchOptions: {
        onResponse(context) {
          responseStatus = context.response.status;
          retryAfterSeconds = getRetryAfterSecondsFromHeaders(
            context.response.headers
          );
        },
      },
    });

    if (responseStatus === 429) {
      throw new SignInRateLimitError(retryAfterSeconds);
    }
  } catch (error) {
    if (responseStatus === 429 || getStatusCode(error) === 429) {
      throw new SignInRateLimitError(
        retryAfterSeconds ?? getRetryAfterSeconds(error)
      );
    }

    throw error;
  }
}

const signIn = async () => {
  if (pendingSocialSignIn) {
    return pendingSocialSignIn;
  }

  pendingSocialSignIn = startSocialSignIn().finally(() => {
    pendingSocialSignIn = null;
  });

  return pendingSocialSignIn;
};

export { signIn, SignInRateLimitError };