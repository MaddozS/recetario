import { authClient } from "./auth-client";

export async function signOut() {
  const { error } = await authClient.signOut();
  if (error) throw error;
}
