import "dotenv/config";
import { listPrices } from "../../stripe/src/stripe-api";
import { syncPlans } from "../src/billing";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL environment variable is not set");
if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY environment variable is not set");

const plans = await listPrices();
await syncPlans(plans);
console.log(`Synced ${plans.length} subscription plans`);
