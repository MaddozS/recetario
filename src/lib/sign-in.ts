import { authClient } from "@/lib/auth-client";

export function getSafeRedirect(): string {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const redirect = params.get("redirect");
  if (
    redirect &&
    redirect.startsWith("/") &&
    !redirect.includes("//") &&
    !redirect.includes(":")
  ) {
    return redirect;
  }
  return "/recipes";
}

export async function signInWithGoogle(redirectUrl?: string) {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: `${window.location.origin}${redirectUrl || "/recipes"}`,
  });
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await authClient.signIn.email({
    email,
    password,
  });
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (authClient.signUp.email as any)({
    email,
    password,
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
  });
  if (error) throw error;
}
