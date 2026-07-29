-- AlterTable: add active column to subscription_plans
ALTER TABLE "subscription_plans" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
