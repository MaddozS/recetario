
/// <reference path="../.astro/types.d.ts" />
declare namespace App {
  // Note: 'import {} from ""' syntax does not work in .d.ts files.
  interface Locals {
      user: import("better-auth").User | null;
      session: import("better-auth").Session | null;
  }
  interface ImportMetaEnv {
    readonly BETTER_AUTH_SECRET: string;
    readonly BETTER_AUTH_URL: string;
    readonly BETTER_AUTH_USE_DB?: string;
    readonly BETTER_AUTH_DB_PATH?: string;
    readonly RECIPES_USE_POSTGRES?: string;
    readonly APP_USE_POSTGRES?: string;
    readonly RECIPES_USE_DB?: string;
    readonly APP_USE_DB?: string;
    readonly RECIPES_DB_PATH?: string;
    readonly APP_DB_PATH?: string;
    readonly RECIPES_STATIC_OWNER_ID?: string;
    readonly RECIPES_STATIC_OWNER_EMAIL?: string;
    readonly DATABASE_URL?: string;
    readonly POSTGRES_URL?: string;
    readonly POSTGRES_SSL_CA?: string;
    readonly POSTGRES_SSL_INSECURE?: string;

    readonly GOOGLE_CLIENT_ID: string;
    readonly GOOGLE_CLIENT_SECRET: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
