import { betterAuth } from "better-auth"

const googleClientId = import.meta.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = import.meta.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const betterAuthUrl = import.meta.env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL;

if (!googleClientId || !googleClientSecret) {
  console.error("Missing Google OAuth credentials. Check your .env file.");
}

export const auth = betterAuth({
  baseURL: betterAuthUrl,
  secret: import.meta.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ["http://localhost:4321"],
  socialProviders: {
    google: {
      clientId: googleClientId as string,
      clientSecret: googleClientSecret as string,
    },
  },
});