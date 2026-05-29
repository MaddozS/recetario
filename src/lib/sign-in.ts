import { authClient } from "@/lib/auth-client";

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

export async function signUpWithEmail(email: string, password: string) {
  const { error } = await authClient.signUp.email({
    email,
    password,
    name: email.split("@")[0],
  });
  if (error) throw error;
}
