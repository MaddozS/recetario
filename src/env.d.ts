/// <reference types="astro/client" />

type AppUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string;
};

declare namespace App {
  interface Locals {
    user: AppUser | null;
    session: { user: AppUser } | null;
    subscription: import("./lib/subscription").UserSubscriptionInfo;
    csrfToken: string | null;
  }

  interface ImportMetaEnv {
    readonly BETTER_AUTH_URL: string;
    readonly BETTER_AUTH_SECRET: string;
    readonly BETTER_AUTH_USE_DB?: string;
    readonly GOOGLE_CLIENT_ID: string;
    readonly GOOGLE_CLIENT_SECRET: string;
    readonly DATABASE_URL: string;

    readonly RECIPES_STATIC_OWNER_ID?: string;
    readonly RECIPES_STATIC_OWNER_EMAIL?: string;

    readonly STRIPE_SECRET_KEY?: string;
    readonly STRIPE_WEBHOOK_SECRET?: string;
    readonly STRIPE_PRICE_ID_BASIC_MONTHLY?: string;
    readonly STRIPE_PRICE_ID_BASIC_YEARLY?: string;
    readonly STRIPE_PRICE_ID_PRO_MONTHLY?: string;
    readonly STRIPE_PRICE_ID_PRO_YEARLY?: string;
    readonly PUBLIC_BETTER_AUTH_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
