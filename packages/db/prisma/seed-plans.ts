import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { PrismaClient } from "./generated-node/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { listPrices } from "../../stripe/src/stripe-api";
import type { SyncPlanInput } from "@recetario/types";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");
if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY environment variable is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function syncPlans(input: SyncPlanInput[]): Promise<void> {
  if (input.length === 0) return;
  for (const plan of input) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }
  const ids = input.map((plan) => plan.id);
  await prisma.subscriptionPlan.updateMany({
    where: { id: { notIn: ids }, active: true },
    data: { active: false },
  });
}

const plans = await listPrices();
await syncPlans(plans);
console.log(`Synced ${plans.length} subscription plans`);

