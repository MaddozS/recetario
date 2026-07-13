import { authClient } from "./auth-client.js";

export async function signOut() {
  const { error } = await authClient.signOut();
  if (error) throw error;
}
