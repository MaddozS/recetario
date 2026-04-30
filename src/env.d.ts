
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
    readonly DATABASE_URL?: string;
    readonly POSTGRES_URL?: string;

    readonly GOOGLE_CLIENT_ID: string;
    readonly GOOGLE_CLIENT_SECRET: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

