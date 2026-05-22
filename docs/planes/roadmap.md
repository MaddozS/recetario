# Roadmap de Funcionalidades — KitchCalc

> Última actualización: 2026-05-17
>
> Ordenado de mayor a menor prioridad. Cada funcionalidad tendrá su propio plan detallado en `docs/planes/<nombre>.md`.

---

## Prioridades

| Nivel      | Significado                                                      |
| ---------- | ---------------------------------------------------------------- |
| 🔴 Crítica | Funcionalidad esencial o casi lista en UI, debe ser la siguiente |
| 🟠 Alta    | Alto valor de negocio, relativamente bajo esfuerzo               |
| 🟡 Media   | Valor importante pero requiere más trabajo                       |
| 🟢 Baja    | "Nice to have", mejora la experiencia                            |
| ⚪ Futuro  | Visión a largo plazo, depende de features anteriores             |

---

## 1. Categorías de recetas ✅

**Archivo de plan:** `docs/planes/categorias-recetas.md`

La columna `category` (TEXT) en `recipes` está implementada con soporte CRUD completo. Las recetas seed tienen `"category": "General"`.

**Lo implementado:**

- Columna `category TEXT` en `recipes` con migración automática
- Badge de categoría en la vista de detalle de receta
- Input editable de categoría en modo edición
- Filtro por categoría en la sidebar (dropdown dinámico)
- Recetas sin categoría muestran "Sin categoría"

---

## 2. Instrucciones / Pasos de preparación ✅

**Archivo de plan:** `docs/planes/instrucciones-receta.md`

Actualmente una receta solo tiene ingredientes y costos. No existe campo para el procedimiento de preparación.

**Alcance:**

- Agregar campo `instructions` (TEXT) a `recipes` o tabla `recipe_steps` (orden, descripción)
- Sección de "Preparación" en la página de detalle de receta
- Editor simple con numeración automática o soporte Markdown
- Opcional: temporizadores por paso

---

## 3. Duplicar receta ✅

**Archivo de plan:** No se creó (`duplicar-receta.md` no existe — se implementó directamente).

Permite crear variaciones de una receta base con un solo clic. Feature gated tras Basic/Pro.

**Lo implementado:**

- Botón "Duplicar" con confirmación en la página de detalle de receta
- Copia profunda: receta + ingredientes + presentaciones
- Nombre automático: "Copia de <nombre original>" (truncado a 120 caracteres)
- Redirección a la nueva receta en modo edición
- Protegido por `hasFeature(subscription, 'recipe_duplicate')` (Free no tiene acceso)

---

## 4. Planificador de producción 🟠 → 🔴 (en curso)

**Archivo de plan:** `docs/planes/produccion/` (carpeta con 13 archivos de plan detallado)
**Plan original:** `docs/planes/planificador-produccion.md`

**Tiers:** Basic (base, límite 3 recetas) / Pro (ilimitado + funcionalidades avanzadas)

**Feature gates:** `production_planner` (Basic+), `production_save` (Pro), `production_advanced` (Pro)

> **Fase 1 completada — 2026-05-17.** Migración a Basic + mejoras de visualización implementadas.

| Fase | Funcionalidad                                                                     | Prioridad | Tier  | Estado        | Archivo                                                                                                                   |
| ---- | --------------------------------------------------------------------------------- | --------- | ----- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| F1   | Migrar acceso a Basic + límite 3 recetas + nuevos feature gates                   | 🔴        | Basic | ✅ Completado | [`produccion/01-migracion-basic.md`](./produccion/01-migracion-basic.md)                                                  |
| F2   | Mejoras visualización (colapsar, sorting, badges margen, costos en summary)       | 🟢        | Basic | ✅ Completado | [`produccion/09-mejoras-visualizacion.md`](./produccion/09-mejoras-visualizacion.md)                                      |
| F3   | Cálculo client-side instantáneo sin POST-redirect                                 | 🔴        | Pro   | ⬜ Pendiente  | [`produccion/02-calculo-client-side.md`](./produccion/02-calculo-client-side.md)                                          |
| F4   | Modo "Pedido de Compras" (lista sin costos, checkboxes, agrupación por proveedor) | 🟠        | Pro   | ⬜ Pendiente  | [`produccion/03-pedido-compras.md`](./produccion/03-pedido-compras.md)                                                    |
| F5   | Guardar y cargar planes de producción (nueva tabla `production_plans`)            | 🟠        | Pro   | ⬜ Pendiente  | [`produccion/04-guardar-cargar-planes.md`](./produccion/04-guardar-cargar-planes.md)                                      |
| F6   | Precios interactivos + análisis de rentabilidad por presentación                  | 🟡        | Pro   | ⬜ Pendiente  | [`produccion/06-precios-interactivos.md`](./produccion/06-precios-interactivos.md)                                        |
| F7   | Exportación CSV de ingredientes consolidados                                      | 🟡        | Pro   | ⬜ Pendiente  | [`produccion/07-exportacion-csv.md`](./produccion/07-exportacion-csv.md)                                                  |
| F8   | Comparativa de escenarios A vs B                                                  | 🟡        | Pro   | ⬜ Pendiente  | [`produccion/05-comparativa-escenarios.md`](./produccion/05-comparativa-escenarios.md)                                    |
| F9   | Checklist de mise en place por receta                                             | 🟢        | Pro   | ⬜ Pendiente  | [`produccion/08-checklist-mise-en-place.md`](./produccion/08-checklist-mise-en-place.md)                                  |
| F10  | Indicadores de disponibilidad de stock                                            | 🟡        | Pro   | ⬜ Pendiente  | [`produccion/10-integracion-stock.md`](./produccion/10-integracion-stock.md) — depende de `stock_tracking` (#7)           |
| F11  | Integración con costos fijos avanzados                                            | 🟡        | Pro   | ⬜ Pendiente  | [`produccion/11-costos-fijos-avanzados.md`](./produccion/11-costos-fijos-avanzados.md) — depende de `advanced_costs` (#9) |
| F12  | Totales nutricionales del plan                                                    | 🟢        | Pro   | ⬜ Pendiente  | [`produccion/12-totales-nutricionales.md`](./produccion/12-totales-nutricionales.md) — depende de `nutrition_info` (#10)  |

---

## 5. Exportación a PDF / Vista de impresión 🟠

**Archivo de plan:** `docs/planes/exportacion-pdf.md`

Fichas de costeo, tarjetas de receta y cotizaciones para clientes.

**Alcance:**

- Estilos `@media print` en CSS para vista limpia sin navegación
- Botón "Imprimir" / "Exportar PDF" por receta y por plan de producción
- Opcional: usar `puppeteer` o `@astrojs/pdf` en server-side para generación real de PDF
- Plantillas: ficha de costeo, tarjeta de receta, cotización

---

## 6. Fotos de recetas 🟡

**Archivo de plan:** `docs/planes/fotos-recetas.md`

Mejora visual enorme y utilidad como catálogo de productos.

**Alcance:**

- Campo `image_url` en `recipes`
- Upload de imagen (local o servicio externo tipo Cloudinary/ImgBB)
- Vista previa en lista de recetas y página de detalle
- Opcional: galería de múltiples imágenes por receta

---

## 7. Gestión de stock de ingredientes 🟡

**Archivo de plan:** `docs/planes/stock-ingredientes.md`

Control de inventario para saber cuándo reordenar.

**Alcance:**

- Agregar `stock_quantity`, `min_stock_threshold` y `stock_unit` a `ingredients`
- Indicador visual de stock bajo (amarillo/rojo) en tabla de ingredientes
- Al planificar producción, descontar del stock automáticamente (opcional)
- Vista rápida: "Ingredientes por agotarse"

---

## 8. Historial de cambios / Auditoría 🟡

**Archivo de plan:** `docs/planes/historial-cambios.md`

Trazabilidad de quién modificó qué y cuándo. Importante para uso comercial con múltiples usuarios.

**Alcance:**

- Tabla `changelog`: `id`, `entity_type`, `entity_id`, `field`, `old_value`, `new_value`, `changed_by`, `changed_at`
- Triggers o middleware en cada operación CRUD
- Vista de historial por receta ("Últimos cambios")
- Opcional: revertir cambios

---

## 9. Costos fijos más sofisticados 🟡

**Archivo de plan:** `docs/planes/costos-fijos-avanzados.md`

Actualmente es un % fijo aplicado sobre el costo de insumos. Poco flexible para negocios reales.

**Alcance:**

- Múltiples líneas de costo fijo por receta (mano de obra, electricidad, gas, empaque, etc.)
- Cada línea: nombre, monto o porcentaje, tipo (fijo por batch, por unidad, por hora)
- Sumatoria automática en el cálculo de costo total
- Vista desglosada en detalle de receta
- Reporte comparativo costo estimado vs real

---

## 10. Información nutricional 🟢

**Archivo de plan:** `docs/planes/informacion-nutricional.md`

Cada vez más relevante para negocios de alimentos y exigido por regulaciones.

**Alcance:**

- Campos nutricionales en `ingredients`: calorías, proteínas, grasas, carbohidratos, fibra, sodio (por 100g o por unidad)
- Vista "Tabla nutricional" en receta (calculada automáticamente por porción)
- Presentación estilo etiqueta regulatoria
- Opcional: cálculo por presentación (aporte nutricional por unidad de venta)

---

## 11. Importar/Exportar datos 🟢

**Archivo de plan:** `docs/planes/importar-exportar-datos.md`

Backup, migración desde otras herramientas, interoperabilidad.

**Alcance:**

- Exportar: botón que descarga JSON con todas las recetas + ingredientes + presentaciones
- Importar: subir archivo JSON y merge con datos existentes
- Opcional: CSV para importar ingredientes desde Excel
- Opcional: endpoint API para herramientas externas

---

## 12. Internacionalización (inglés) 🟢

**Archivo de plan:** `docs/planes/internacionalizacion.md`

Abrir el mercado a usuarios de habla inglesa.

**Alcance:**

- Extraer todos los textos a archivos de traducción (ES, EN)
- Usar i18n routing de Astro (`/en/recipes`, `/es/recipes`)
- Selector de idioma en settings
- Traducción de seed data

---

## 13. Colaboración / Equipos ⚪

**Archivo de plan:** `docs/planes/colaboracion-equipos.md`

Actualmente cada usuario ve solo sus datos. Permitir compartir recetas con otros usuarios.

**Alcance:**

- Tabla `team_members`: `team_id`, `user_id`, `role`
- Compartir receta individual o biblioteca completa
- Roles: dueño, editor, lector
- UI para gestionar miembros del equipo

---

## 14. API pública / Webhooks ⚪

**Archivo de plan:** `docs/planes/api-publica.md`

Exponer endpoints para integración con e-commerce, POS, o apps de delivery.

**Alcance:**

- API keys por usuario (generar/revocar en settings)
- Endpoints REST: GET recetas, GET ingredientes, GET costos
- Rate limiting por key
- Webhooks para notificar cambios (receta actualizada, etc.)

---

## Estado actual del proyecto

| Característica                    | Estado                                                                   |
| --------------------------------- | ------------------------------------------------------------------------ |
| CRUD Ingredientes                 | ✅ Completo                                                              |
| CRUD Recetas                      | ✅ Completo                                                              |
| Cálculo de costos                 | ✅ Completo                                                              |
| Presentaciones de venta           | ✅ Completo                                                              |
| Escalado por batch                | ✅ Completo                                                              |
| Autenticación (Google OAuth)      | ✅ Completo                                                              |
| Multi-tenancy (datos por usuario) | ✅ Completo                                                              |
| Tema claro/oscuro                 | ✅ Completo                                                              |
| Colores de acento                 | ✅ Completo                                                              |
| Vista responsive/mobile           | ✅ Completo                                                              |
| Datos semilla                     | ✅ Completo                                                              |
| Búsqueda de recetas               | 🚧 Parcial (client-side)                                                 |
| Categorías de recetas             | ✅ Completo                                                              |
| Instrucciones de preparación      | ✅ Completo                                                              |
| Duplicar receta                   | ✅ Completo                                                              |
| Planificador de producción        | 🚧 Fase 1 completada (Basic+Pro). Fase 2 (cálculo client-side) pendiente |
| Exportación PDF                   | ❌ No implementado                                                       |
