# The Worker reaches Prisma Postgres over TCP, with one client per request

`packages/db` builds its Prisma client with `@prisma/adapter-pg` (`PrismaPg`) and creates a new one **per request**, held in an `AsyncLocalStorage` store that the `prisma` proxy resolves on every call. The Prisma Postgres serverless driver (`@prisma/adapter-ppg`, chosen in ADR 0010) is gone.

## Context

ADR 0010 replaced Accelerate with the serverless driver to keep a module-scope singleton. That decision optimised for lifecycle simplicity and paid for it in latency, which only showed up on multi-query paths — and it showed up hard in the Stripe webhook.

Measured on the same machine and database (a subscription update replaying a real event):

| Path                                 | Per query                  | Interactive transaction |
| ------------------------------------ | -------------------------- | ----------------------- |
| Node + TCP (`PrismaPg`)              | ~170 ms                    | —                       |
| Node + serverless driver (HTTP)      | ~890–1060 ms               | 1489 ms                 |
| Worker (workerd) + serverless driver | ~0.3–2.7 s, spikes of 12 s | 2137 ms                 |
| Worker (workerd) + TCP               | **~165 ms**                | **494 ms**              |

The webhook path (`customer.subscription.updated` against a persisted subscription) needs 4 HTTP queries, one Stripe call and a 4-6 statement transaction. With the serverless driver that totalled **18.7 s, 46 s and 60 s** across runs: over the Stripe CLI's 30 s forwarding timeout, and past `INGESTION_TRANSACTION_OPTIONS.timeout` (15 s), which throws — the 500s in the log. With TCP the same path lands at **3.6 s**.

Production (staging, Cloudflare's edge) never showed the failure — a database-backed page answered in 0.44 s warm — because the edge sits much closer to the database than a laptop does. But the worst case was broken wherever the round trip is larger, and every path was paying 5-6x per query.

Reusing a single module-scope client with `PrismaPg` was measured too, since it would have kept the old shape: in workerd the first query took **46 s** and the next request was cancelled by the runtime ("your Worker's code had hung"), because the client owns TCP sockets and workerd binds that I/O to the request that opened them. This is the constraint Prisma's Cloudflare Workers guide states as "create a new Prisma Client instance per request".

## Decision

- The worker builds a `PrismaClient` per request with `PrismaPg` and runs the rest of the request inside `AsyncLocalStorage.run(client, next)`, disconnecting in a `finally`.
- `prisma` becomes a lazy proxy that resolves nothing until a method is **called**: `prisma.user.findMany()` looks the client up in the store at call time. Capturing it at module load (`prismaAdapter(prisma, …)` in `packages/auth`) is therefore safe.
- `getPrisma()` throws a clear error when used outside a request context.
- Node scripts and seeds keep building their own `PrismaPg` clients (Node has no per-request socket constraint).

`DATABASE_URL` does not change: the pooled connection string works for both adapters.

## Considered Options

- **Stay on the serverless driver**: rejected. It leaves the worst case (the webhook) broken wherever the round trip is large, and pays 5-6x per query everywhere else.
- **Raise the transaction cap** (`INGESTION_TRANSACTION_OPTIONS.timeout`): rejected. It hides the cause, and the cap protects the advisory lock.
- **A module-scope client with `PrismaPg`** (no `AsyncLocalStorage`): rejected — measured, hangs and gets cancelled (see Context).
- **Threading the client through every CRUD signature**: rejected as the first choice. It is explicit and testable, but touches ~15 modules plus Better Auth's adapter; `AsyncLocalStorage` gets the same per-request lifecycle without changing a single call site. If ALS ever proves flaky in workerd, this is the fallback.

## Consequences

- Every worker request pays one TCP connection setup (~1.0-1.7 s locally, much less from the edge). Light requests therefore got slightly _slower_ locally (sign-in: 1.01 s → 1.19 s), while heavy ones got 5-16x faster. If the light path ever matters, the next lever is a connection pooler at the edge (Hyperdrive-style), not going back to HTTP.
- `packages/db` no longer uses `@prisma/adapter-ppg`; `@prisma/adapter-pg` + `pg` cover both the worker and the Node scripts.
- The lazy proxy must never look like a thenable (`then` resolves to `undefined`), or `await prisma.user` would hang under `AsyncLocalStorage`.
- Rollback is code-only: revert the commit, `DATABASE_URL` stays valid.
