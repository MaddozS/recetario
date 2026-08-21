-- CreateEnum
CREATE TYPE "CheckoutIntentState" AS ENUM ('pending', 'consumed');

-- CreateEnum
CREATE TYPE "StripeEventAttemptOutcome" AS ENUM ('applied', 'ignored', 'failed');

-- CreateTable
CREATE TABLE "checkout_intents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "checkout_session_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "price_id" TEXT NOT NULL,
    "state" "CheckoutIntentState" NOT NULL DEFAULT 'pending',
    "stripe_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "checkout_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_event_attempts" (
    "id" TEXT NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "stripe_created" BIGINT NOT NULL,
    "stripe_subscription_id" TEXT,
    "outcome" "StripeEventAttemptOutcome" NOT NULL,
    "ignored_reason" TEXT,
    "failure_message" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_event_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkout_intents_checkout_session_id_key" ON "checkout_intents"("checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_intents_stripe_subscription_id_key" ON "checkout_intents"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "checkout_intents_user_id_state_idx" ON "checkout_intents"("user_id", "state");

-- CreateIndex
CREATE INDEX "checkout_intents_expires_at_idx" ON "checkout_intents"("expires_at");

-- CreateIndex
CREATE INDEX "checkout_intents_stripe_subscription_id_idx" ON "checkout_intents"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "stripe_event_attempts_stripe_subscription_id_stripe_created_idx" ON "stripe_event_attempts"("stripe_subscription_id", "stripe_created", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_event_attempts_stripe_event_id_attempt_number_key" ON "stripe_event_attempts"("stripe_event_id", "attempt_number");
