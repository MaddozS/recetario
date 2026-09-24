# Documentación — qué está viva y qué es histórica

Este directorio mezcla documentación **viva** (guía operativa) con el **registro histórico** del rework Astro → Nuxt (task files, specs e investigaciones). Esta página dice qué es qué; la regla viene de `adr/0009-nuxt-frontend-rework.md` (§Consequences): lo histórico se **identifica**, no se reescribe.

## Viva

| Documento                          | Qué es                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| `../AGENTS.md`                     | Fuente de verdad: arquitectura, convenciones, comandos y gotchas |
| `../README.md`                     | Setup, comandos y estructura del monorepo                        |
| `../DEPLOY.md`                     | Cloudflare, migraciones, secrets, entornos y rollback            |
| `../CONTEXT.md`                    | Glosario de dominio                                              |
| `qa-agent-browser.md`              | Guía de QA manual/funcional con `agent-browser`                  |
| `adr/0009-nuxt-frontend-rework.md` | Decisión del rework Nuxt (implementada en la Task 13b)           |
| `adr/0010-sin-accelerate-prisma-postgres-directo.md` | Salida de Accelerate: driver serverless de Prisma Postgres |
| `agents/*`                         | Cómo consumen las skills la documentación del repo               |
| `venta/*`                          | Material comercial                                               |

## Histórica (identificada, no reescrita)

| Camino                                                                | Qué contiene                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `tasks/**`                                                            | Registro por sesión del rework (Tasks 1–13b): decisiones, verificación, hallazgos    |
| `specs/**` y `../specs/**`                                            | Diseños previos a la migración a Nuxt (pre-Nuxt)                                     |
| `research/**`                                                         | Investigaciones que alimentaron la decisión (framework, CI, wrangler)                |
| `superpowers/plans/**`                                                | Planes de sesiones anteriores                                                        |
| `../DESIGN.md` (§8–§10)                                               | Ejemplos y rutas `.astro`; el sistema de diseño sigue vivo, la implementación es Vue |
| `../landing-audit-actions.md`, `../security_best_practices_report.md` | Auditorías previas a la migración                                                    |

Los ADR `0001`–`0008` se conservan como registro de decisiones; donde una decisión cambió (workflows, Pages, íconos) llevan una nota que apunta al `0009`.
