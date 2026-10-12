# Documentación del Proyecto

Guía de referencia y mapa de documentación viva y operativa del repositorio KitchCalc.

## Documentación Principal

| Documento | Qué es |
| :--- | :--- |
| [`../README.md`](../README.md) | Setup, comandos y estructura del monorepo |
| [`../PRODUCT.md`](../PRODUCT.md) | Definición de producto, público objetivo, personalidad de marca y principios de diseño |
| [`../CONTEXT.md`](../CONTEXT.md) | Glosario de dominio del proyecto |
| [`../DEPLOY.md`](../DEPLOY.md) | Despliegue en Cloudflare Workers, migraciones, secrets y rollback |
| [`../DESIGN.md`](../DESIGN.md) | Sistema de diseño: tokens HSL, paleta de colores, tipografía y componentes |
| [`qa-agent-browser.md`](qa-agent-browser.md) | Guía de QA manual y funcional E2E con `agent-browser` |
| [`adr/0009-nuxt-frontend-rework.md`](adr/0009-nuxt-frontend-rework.md) | Decisión del rework a Nuxt 4 (SSR sobre Nitro en Cloudflare Worker) |
| [`adr/0010-sin-accelerate-prisma-postgres-directo.md`](adr/0010-sin-accelerate-prisma-postgres-directo.md) | Salida de Accelerate: driver serverless directo de Prisma Postgres |
| [`adr/0011-transporte-tcp-en-el-worker.md`](adr/0011-transporte-tcp-en-el-worker.md) | Conexión TCP en Worker con cliente Prisma por request |
| [`agents/*`](agents/domain.md) | Convenciones de issue tracker, etiquetas y consumo de docs por agentes |
| [`venta/*`](venta/GUIA-VENTA.md) | Material comercial: guía práctica de ventas y dossier |
| [`../apps/api/README.md`](../apps/api/README.md) | Arquitectura y referencia del API Worker en Hono |
| `../packages/*/README.md` | Documentación técnica de cada paquete del monorepo (`auth`, `config`, `db`, `stripe`, `types`) |
