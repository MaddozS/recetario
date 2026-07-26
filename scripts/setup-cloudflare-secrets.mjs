import { config } from "dotenv";
import { writeFileSync } from "node:fs";

config();

const PROD_URL = "https://recetario-web.axel-ana25.workers.dev";
const prismaUrl =
  process.env.PRISMA_URL_OVERRIDE ?? process.env.DATABASE_URL;
if (!prismaUrl || prismaUrl.includes("localhost")) {
  console.error(
    "PRISMA_URL_OVERRIDE required (DATABASE_URL in .env is localhost).",
  );
  process.exit(1);
}

const webSecrets = {
  DATABASE_URL: prismaUrl,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: PROD_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  RECIPES_STATIC_OWNER_ID: process.env.RECIPES_STATIC_OWNER_ID,
  RECIPES_STATIC_OWNER_EMAIL: process.env.RECIPES_STATIC_OWNER_EMAIL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID_BASIC_MONTHLY: process.env.STRIPE_PRICE_ID_BASIC_MONTHLY,
  STRIPE_PRICE_ID_BASIC_YEARLY: process.env.STRIPE_PRICE_ID_BASIC_YEARLY,
  STRIPE_PRICE_ID_PRO_MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
  STRIPE_PRICE_ID_PRO_YEARLY: process.env.STRIPE_PRICE_ID_PRO_YEARLY,
};

const apiSecrets = {
  DATABASE_URL: prismaUrl,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};

const missingWeb = Object.entries(webSecrets)
  .filter(([, v]) => !v)
  .map(([k]) => k);
const missingApi = Object.entries(apiSecrets)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missingWeb.length || missingApi.length) {
  console.error("Missing values:", { web: missingWeb, api: missingApi });
  process.exit(1);
}

writeFileSync("/tmp/web-secrets.json", JSON.stringify(webSecrets, null, 2));
writeFileSync("/tmp/api-secrets.json", JSON.stringify(apiSecrets, null, 2));
console.log("wrote /tmp/web-secrets.json (14 keys)");
console.log("wrote /tmp/api-secrets.json (4 keys)");
