import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient();

let pendingSignOut: Promise<void> | null = null;

async function startSignOut() {
  await authClient.signOut();
}

const signOut = async () => {
  if (pendingSignOut) {
    return pendingSignOut;
  }

  pendingSignOut = startSignOut().finally(() => {
    pendingSignOut = null;
  });

  return pendingSignOut;
};

export { signOut };