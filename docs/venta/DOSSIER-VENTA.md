# KitchCalc — Dossier de Venta

**Calculadora de costos de recetas para profesionales de la cocina**
Documento de presentación para posibles compradores. Versión: agosto 2026.

---

## 1. Resumen ejecutivo

KitchCalc es una aplicación web SaaS (software por suscripción) que ayuda a profesionales de la cocina —reposteros, caterers, food trucks y pequeños productores de alimentos— a calcular el costo real de sus recetas y fijar precios rentables.

El producto está **construido, desplegado y funcionando** en producción:

| Concepto            | Estado                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Producto            | Calculadora de costeo de recetas con suscripciones de pago             |
| Mercado             | Profesionales de alimentos en mercados hispanohablantes                |
| Sitio en producción | `app.kitchcalc.com` (app) + `api.kitchcalc.com` (servicios)            |
| Modelo de negocio   | Freemium: plan gratuito + 2 planes de pago (mensual/anual)             |
| Cobros              | Automatizados vía Stripe (tarjetas, renovaciones, cancelaciones)       |
| Infraestructura     | Cloudflare + base de datos gestionada: costo fijo cercano a $0 USD/mes |
| Idioma del producto | Español (mercado meta)                                                 |

El comprador adquiere: el código completo, la marca KitchCalc, los dominios, y la transferencia de todas las cuentas de servicio (Cloudflare, Stripe, Google, Resend, Prisma).

---

## 2. El problema que resuelve

Los emprendedores de alimentos calculan sus costos en hojas de cálculo o de memoria. El resultado típico:

- No saben su **costo real por unidad** (ignoran costos fijos, mermas y tiempo).
- Fijan precios "a ojo" y descubren tarde que **pierden dinero en cada venta**.
- No pueden responder preguntas básicas: ¿subo el precio o bajo el costo? ¿Me conviene vender por docena o por pieza?

KitchCalc responde esas preguntas en minutos: el usuario registra sus ingredientes con precios de compra, arma sus recetas, y la plataforma calcula costos, márgenes y precios de venta sugeridos de forma transparente ("muestra la matemática": cada número es trazable).

**Usuario objetivo:** dueños únicos o equipos muy pequeños que hacen de todo (cocinan, venden, administran) y valoran velocidad y claridad.

---

## 3. Qué hace el producto hoy

### Gestión de ingredientes

- Registro de ingredientes con precio de compra, cantidad de compra, unidad, marca y proveedor.
- Cálculo automático del costo por unidad de medida.
- Protección de datos: no se puede borrar un ingrediente usado en recetas (evita romper costeos históricos).

### Gestión de recetas y costeo

- Recetas con ingredientes, cantidades y categorías; instrucciones con formato enriquecido.
- **Presentaciones / lotes**: la misma receta puede venderse en distintos formatos (pieza, docena, kilo) con precio de venta propio.
- **Costos fijos** configurables por receta y por presentación (porcentaje o monto; por lote, por unidad o por hora de trabajo).
- Resumen financiero claro: costo de insumos + gastos operativos = costo total real, y margen de utilidad objetivo.
- Duplicado de recetas para crear variantes rápido.

### Planificador de producción

- Selecciona recetas y cantidades a producir y calcula costos y necesidades totales de un corrido de producción.
- Disponible desde el plan Basic (hasta 3 recetas por planificación) e ilimitado en Pro.

### Cuentas de usuario

- Registro con Google o correo/contraseña, verificación de email y recuperación de contraseña por email.
- Cada usuario ve **únicamente sus propios datos** (aislamiento multi-usuario verificado con pruebas automáticas).
- Preferencias personales: tema claro/oscuro y 7 colores de acento.
- Página de precios pública, términos de servicio y política de privacidad incluidos.

### Suscripciones y pagos (100% automatizados)

- Checkout con Stripe, portal de autogestión para el cliente (cambiar tarjeta, cancelar, ver facturas).
- Renovaciones, fallos de pago y cancelaciones se sincronizan solos con la base de datos.
- Sistema anti-fraude de eventos: cada notificación de Stripe se registra y procesa en orden, sin duplicados (idempotencia).

---

## 4. Modelo de negocio y precios

Freemium con dos planes de pago, cada uno en versión mensual y anual (la anual con descuento). Los precios exactos se configuran en Stripe y pueden cambiarse sin tocar código.

|                                                                         | **Free** | **Basic**       | **Pro**                                  |
| ----------------------------------------------------------------------- | -------- | --------------- | ---------------------------------------- |
| Recetas                                                                 | 10       | 75              | Ilimitadas                               |
| Ingredientes                                                            | 30       | Ilimitados      | Ilimitados                               |
| Costeo con márgenes                                                     | ✅       | ✅              | ✅                                       |
| Duplicar recetas                                                        | —        | ✅              | ✅                                       |
| Planificador de producción                                              | —        | Hasta 3 recetas | Ilimitado                                |
| Fotos, stock, PDF, historial, importar/exportar, nutrición, modo cocina | —        | —               | ✅ (según disponibilidad, ver sección 9) |

**Palancas de monetización ya construidas:**

- Límites por plan aplicados en el servidor (no se pueden saltar desde el navegador).
- 12 _feature flags_ (interruptores de funciones) que se activan o desactivan por plan desde un solo archivo de configuración.
- Pasarela de mejora contextual: cuando el usuario alcanza un límite, la app lo dirige al checkout con un mensaje de venta.

---

## 5. Tecnología (versión sin tecnicismos)

KitchCalc está construido con tecnología moderna de primera línea, elegida para **minimizar el costo de operación y mantenimiento**:

- **Infraestructura serverless en Cloudflare** (la misma red que sirve una parte importante del tráfico mundial). No hay servidores que administrar: se paga por uso y la capa gratuita cubre la operación de un negocio en etapa temprana.
- **Base de datos PostgreSQL gestionada** (vía Prisma Postgres): respaldos y mantenimiento a cargo del proveedor.
- **Arquitectura de dos aplicaciones**: una sirve la interfaz y otra los datos; esto permite escalar y modificar cada parte por separado.
- **Multi-tenant desde el diseño**: cada registro de la base de datos pertenece a un usuario, y el aislamiento se aplica dentro de la capa de datos (verificado con pruebas automáticas dedicadas).

**Costo fijo de infraestructura actual: cercano a $0 USD/mes** (planes gratuitos de Cloudflare y Prisma dentro de los límites actuales de uso). El primer escalón de pago, si el tráfico crece, es de unos $5 USD/mes en Cloudflare.

---

## 6. Operación diaria

El producto está diseñado para operar con dedicación mínima:

- **Despliegues automáticos**: al publicar código en la rama de desarrollo se actualiza el entorno de pruebas; al publicar en la rama principal se actualiza producción. Verificaciones automáticas (lint, tipos, pruebas, build) corren en cada cambio antes de permitir la publicación.
- **Monitoreo incluido**: los logs de ambas aplicaciones se consultan desde el panel de Cloudflare o en vivo desde la terminal. Reversión a una versión anterior: un comando.
- **Secretos y credenciales**: gestionados con un script incluido que los sincroniza con Cloudflare de forma declarativa; nunca viven en el código.
- **Cambios de base de datos**: sistema de migraciones versionadas; los cambios se aplican de forma controlada y reproducible.

**Mantenimiento estimado**: revisar logs ocasionalmente, renovar dominios y atender facturas de Stripe si hay fallos de pago. No hay procesos manuales diarios.

---

## 7. Seguridad y protección de datos

- Autenticación con **Better Auth** (librería de referencia en el ecosistema JavaScript): sesiones firmadas, tokens de recuperación de un solo uso con expiración.
- **Bitácora de auditoría** de acciones sensibles (inicio de sesión, cambio/restablecimiento de contraseña, revocación de sesiones) con IP y agente de usuario.
- Verificación de firmas criptográficas en **todas** las notificaciones de Stripe (no se aceptan eventos falsificados).
- Aislamiento por usuario aplicado en la capa de datos, con pruebas automatizadas que lo verifican método por método.
- Secretos solo en el gestor de Cloudflare; el repositorio no contiene credenciales.
- Cabeceras y validación de entrada (Zod) en todos los endpoints de la API.

---

## 8. Calidad del código y documentación incluida

Este no es un prototipo: es un producto con ingeniería seria, lo que **reduce el riesgo del comprador** y el costo de cualquier desarrollo futuro.

- **44 archivos de pruebas automatizadas** (Vitest) cubriendo la API, la capa de datos, la lógica de facturación y el aislamiento multi-usuario.
- **CI en cada cambio**: lint, chequeo de tipos, pruebas y build en paralelo, filtrado por Turborepo para velocidad.
- **Documentación de arquitectura**: 7 _Architecture Decision Records_ (ADRs) que explican el "porqué" de cada decisión importante.
- **8 especificaciones de funcionalidades** implementadas (landing, registro, recuperación de contraseña, facturación, etc.).
- **Sistema de diseño completo** documentado (colores, tipografía, componentes, animaciones, reglas de accesibilidad WCAG 2.1 AA, modo oscuro).
- **Manual de despliegue** (`DEPLOY.md`) con procedimientos paso a paso, incluyendo solución de problemas conocidos.
- **Mapa de conocimiento del código** (graphify) para navegación rápida del proyecto.

---

## 9. Oportunidad de crecimiento

El valor principal para el comprador: **el roadmap ya está sembrado en el producto**. Existen 12 funciones definidas con sus interruptores de activación; varias se ofrecen en la página de precios como "próximamente" (genera expectativa de venta sin costo de desarrollo adicional):

| Función (flag)             | Free | Basic | Pro |
| -------------------------- | ---- | ----- | --- |
| Duplicar recetas           | —    | ✅    | ✅  |
| Fotos de recetas           | —    | ✅    | ✅  |
| Stock de ingredientes      | —    | ✅    | ✅  |
| Planificador de producción | —    | ✅    | ✅  |
| Guardar planificaciones    | —    | —     | ✅  |
| Producción avanzada        | —    | —     | ✅  |
| Exportar a PDF             | —    | —     | ✅  |
| Costos fijos avanzados     | —    | ✅    | ✅  |
| Historial de cambios       | —    | —     | ✅  |
| Importar/exportar datos    | —    | —     | ✅  |
| Información nutricional    | —    | —     | ✅  |
| Modo cocina (paso a paso)  | —    | —     | ✅  |

**Levers de crecimiento adicionales:**

1. **Activar funciones "próximamente"**: cada una es un motivo de mejora de plan comunicable. Exportar a PDF y stock de ingredientes son las de mayor demanda típica en este nicho.
2. **Ajustar precios sin código**: los precios y límites se administran desde Stripe y la configuración de planes.
3. **Mercado ampliado**: el producto está en español; localizar a inglés/portugués abre LATAM completa, EE.UU. y Brasil (nichos de repostería y food trucks muy activos).
4. **Canales de adquisición aún sin explotar**: SEO de contenido (calculadoras y guías de costeo), TikTok/Instagram de recetas con costeo, alianzas con escuelas de repostería.

---

## 10. Qué incluye la venta

| Activo                | Detalle                                                                           |
| --------------------- | --------------------------------------------------------------------------------- |
| Código fuente         | Monorepo completo (2 aplicaciones + 5 paquetes internos), historial git incluido  |
| Marca                 | Nombre KitchCalc, logotipo y sistema de diseño                                    |
| Dominios              | `kitchcalc.com`, `app.kitchcalc.com`, `api.kitchcalc.com`                         |
| Infraestructura       | Proyecto y workers en Cloudflare (transferencia de cuenta o recreación asistida)  |
| Base de datos         | Proyecto Prisma Postgres con todos los datos de usuarios                          |
| Pagos                 | Productos y precios configurados en Stripe; webhooks documentados                 |
| Cuentas de servicio   | Google OAuth, Resend (emails transaccionales)                                     |
| Documentación         | Este dossier + manual de despliegue + ADRs + especificaciones + sistema de diseño |
| Soporte de transición | Sesiones de traspaso con el desarrollador original (a acordar)                    |

**No incluye** (a acordar): cuentas personales de analytics, listas de correo de marketing.

---

## 11. Métricas del negocio _(completar antes de compartir)_

> El comprador querrá números. Actualizar esta tabla con datos reales de Stripe y Cloudflare antes de enviar el dossier.

| Métrica                          | Valor            | Fuente                      |
| -------------------------------- | ---------------- | --------------------------- |
| Usuarios registrados             | —                | Base de datos / Better Auth |
| Usuarios activos mensuales       | —                | Cloudflare Web Analytics    |
| Conversión free → pago           | —                | Stripe / base de datos      |
| MRR (ingreso mensual recurrente) | —                | Stripe Dashboard            |
| Ingresos últimos 12 meses        | —                | Stripe Dashboard            |
| Churn mensual                    | —                | Stripe Dashboard            |
| Costo mensual de infraestructura | ~$0 (free tiers) | Cloudflare / Prisma         |

---

## 12. Glosario para no técnicos

| Término      | Significado                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- |
| SaaS         | Software que se paga por suscripción y se usa desde el navegador.                               |
| MRR          | Ingreso mensual recurrente: la suma de las suscripciones activas mensualizadas.                 |
| Churn        | Porcentaje de suscriptores que cancelan cada mes.                                               |
| Freemium     | Modelo con plan gratuito permanente y planes de pago con más funciones.                         |
| Feature flag | Interruptor interno que activa o desactiva una función por plan, sin cambiar código.            |
| Serverless   | Infraestructura donde el proveedor administra los servidores; se paga por uso.                  |
| Multi-tenant | Una sola instalación del producto sirve a muchos clientes, con datos aislados entre sí.         |
| CI/CD        | Verificaciones y publicaciones automáticas del software en cada cambio.                         |
| Webhook      | Notificación automática que Stripe envía al producto ante cada cobro o cancelación.             |
| Idempotencia | Garantía de que un evento repetido no se procesa dos veces (evita cobros o estados duplicados). |
| ADR          | Documento breve que registra una decisión técnica importante y su justificación.                |

---

_Cifras de precios de planes: los montos exactos se administran en Stripe y no se fijan en este documento. Toda la funcionalidad descrita está implementada salvo las marcadas como "próximamente" en la sección 9._
