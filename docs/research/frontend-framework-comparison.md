# Comparación de frameworks frontend para reemplazar Astro en Recetario

> **Histórico (pre-Nuxt).** Documento de la etapa anterior a la migración a Nuxt (Task 13b): se conserva como registro, no como guía operativa, y las rutas o comandos que cita pueden no existir. Ver `docs/README.md`.

**Fecha de corte:** 2026  
**Opciones evaluadas:** Nuxt, Next.js, SvelteKit y React Router (Framework Mode)  
**Fuentes:** exclusivamente documentación oficial, repositorios oficiales y páginas first-party. No se usan encuestas, benchmarks ni artículos de terceros.

## Resumen ejecutivo

**Recomendación: React Router en Framework Mode, desplegado con la integración oficial de Cloudflare, manteniendo `apps/api` (Hono) como Worker separado y consumiéndolo mediante el service binding existente.**

Es la opción más equilibrada para este caso, no la “mejor” en abstracto:

1. Recetario es ante todo una **aplicación privada altamente interactiva**, no un sitio de contenido. React y el modelo de rutas con `loader`, `action`, `<Form>` y `fetcher` encajan mejor que scripts DOM imperativos: las mutaciones revalidan automáticamente los datos de la ruta y los fetchers exponen estado pendiente sin navegación ([React Router: Route Module](https://reactrouter.com/start/framework/route-module), [Actions](https://reactrouter.com/start/framework/actions)).
2. Conserva **SSR para páginas públicas y SEO**, permite prerender selectivo y puede usar loaders/client loaders según la ruta ([Rendering Strategies](https://reactrouter.com/start/framework/rendering)).
3. Cloudflare mantiene una guía/template específicos y combina React Router con el **Cloudflare Vite plugin**; la propia documentación de React Router remite a ese despliegue mantenido por Cloudflare ([Cloudflare: React Router](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/), [React Router: Deploying](https://reactrouter.com/start/framework/deploying)). Es una ruta más directa al runtime Workers que traducir el modelo de Next mediante un adaptador.
4. Tiene integración first-party documentada por Better Auth y usa directamente `Request`/`Response`, loaders y actions ([Better Auth: React Router](https://better-auth.com/docs/integrations/react-router)).
5. Frente a SvelteKit sacrifica algo de concisión y tamaño conceptual, pero reduce riesgo de contratación/ecosistema al apoyarse en React. Frente a Next.js sacrifica RSC, el sistema de imágenes/metadata más completo y parte de su ecosistema, pero evita complejidad de caché/RSC y una capa de adaptación adicional en Workers.

**Segunda opción: SvelteKit**, si el equipo acepta conscientemente un ecosistema y mercado de talento menores a cambio de la mejor ergonomía para reescribir componentes y scripts DOM como UI reactiva, junto con una integración Cloudflare oficial muy limpia.

**Elegiría Nuxt** si el equipo ya domina Vue o quiere estandarizar en Vue. Es técnicamente sólido, híbrido y productivo, pero introducir Vue desde cero no aporta una ventaja decisiva aquí.

**Elegiría Next.js** si el requisito empresarial prioritario fuera contratar en el ecosistema React/Next, compartir componentes con una organización ya estandarizada en Next, o explotar específicamente RSC/Server Actions/metadata e imágenes; **no lo elegiría como primera opción mientras Cloudflare Workers y service bindings sean restricciones centrales**, porque su modelo completo presupone capacidades de plataforma amplias y en Cloudflare depende de una capa adaptadora.

---

## Contexto y criterios

Recetario es un monorepo pnpm en TypeScript. `apps/web` usa Astro SSR y se despliega como Cloudflare Worker; llama a `apps/api` Hono por service binding. El repositorio actual contiene 65 archivos `.astro` y varias utilidades TypeScript orientadas a comportamiento DOM. Hay dos superficies distintas:

- **pública:** landing, precios, privacidad/términos y potencial contenido indexable; necesita HTML inicial, metadata, canonical/OG y sitemap/robots;
- **privada:** recetas, ingredientes, producción, settings/billing y auth; necesita navegación fluida, formularios complejos, estado pendiente/optimista, invalidación y composición reactiva.

La evaluación prioriza: SSR/SEO, modelo interactivo y formularios, Workers/service bindings, madurez verificable, DX/mantenibilidad, portabilidad, migración y riesgo operacional. “Adopción empresarial” no se infiere de logos promocionales ni estrellas: se valora mediante antigüedad/continuidad del proyecto, gobernanza, compatibilidad mantenida por proveedores, superficie de APIs estables y ecosistema base.

## Resultado resumido

Escala cualitativa: **5 = ajuste excelente**, **1 = ajuste débil** para *este* proyecto. No es un benchmark universal.

| Criterio | Nuxt 4 | Next.js 16 | SvelteKit 2 | React Router 8 Framework Mode |
|---|---:|---:|---:|---:|
| SSR, prerender y SEO público | 5 | 5 | 4 | 4 |
| UI privada interactiva | 5 | 5 | 5 | 5 |
| Formularios/mutaciones contra API separada | 4 | 3 | 5 | 5 |
| Cloudflare Workers nativo/directo | 4 | 3 | 5 | 5 |
| Acceso a service bindings | 4 | 4 mediante adaptador | 5 | 5 |
| Madurez/ecosistema/talento | 4 | 5 | 3 | 5 |
| Simplicidad operacional | 4 | 2 | 5 | 4 |
| Portabilidad entre hosts | 4 | 3 | 5 | 5 |
| Migración desde Astro + scripts DOM | 4 | 3 | 5 | 4 |
| Ajuste global a Recetario | **4.2** | **3.7** | **4.6** | **4.7** |

Las diferencias pequeñas no deben leerse como precisión matemática. React Router gana por riesgo total; SvelteKit gana en elegancia técnica de la reescritura.

---

## Base común: Workers y service bindings

Un service binding permite comunicación Worker-a-Worker sin URL pública y se invoca mediante el binding del entorno; Cloudflare documenta tanto `fetch` como RPC ([Cloudflare: Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/), [RPC](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/)). Por tanto, **ninguno de los cuatro frameworks obliga a fusionar `apps/api` con el frontend**. La cuestión real es cuán directamente expone el adaptador el `env` de Cloudflare al código servidor.

Patrón recomendado para cualquier candidato:

```ts
// pseudocódigo en código exclusivamente servidor
const response = await env.API.fetch(
  new Request("https://api.internal/recipes", {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  }),
);
```

Se debe encapsular en un módulo server-only (`api.server.ts`, equivalente Nuxt/SvelteKit) para:

- impedir que el binding llegue al bundle cliente;
- conservar tipos generados con `wrangler types`;
- centralizar forwarding de cookies, trazas, timeouts y traducción de errores;
- facilitar cambiar el transporte a HTTP sin reescribir componentes.

El binding sigue siendo **lock-in de infraestructura de Cloudflare**, independientemente del framework. La interfaz Fetch estándar y un adapter local minimizan ese lock-in.

---

## Nuxt 4

### SSR, SEO y metadata

Nuxt usa renderizado universal por defecto: produce HTML completo en servidor y luego hidrata Vue; su documentación lo vincula explícitamente con indexación y carga inicial ([Nuxt: Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)). Las route rules permiten combinar prerender, SSR y secciones client-only; encaja bien con landing pública y dashboard privado.

El sistema de head es fuerte: `useHead` admite datos reactivos y `useSeoMeta` ofrece claves SEO tipadas; también hay componentes `<Title>`, `<Meta>`, `<Link>` y plantillas de título ([Nuxt: SEO and Meta](https://nuxt.com/docs/4.x/getting-started/seo-meta), [useSeoMeta](https://nuxt.com/docs/4.x/api/composables/use-seo-meta)). Es suficiente para canonical, OG/Twitter y metadata dinámica de recetas públicas.

### Reactividad, estado y formularios

Vue Composition API (`ref`, `computed`, composables) da un reemplazo claro a los scripts DOM. `useState` es estado compartido reactivo compatible con SSR ([Nuxt: State Management](https://nuxt.com/docs/4.x/getting-started/state-management)). Para estado de servidor, `useFetch`/`useAsyncData` y refresh son convenciones integradas.

El punto menos limpio para Recetario es que la API autoritativa ya vive en Hono. Las rutas Nitro y utilidades full-stack de Nuxt pueden convertirse en una segunda capa BFF. Puede ser útil para proteger el binding, pero conviene evitar duplicar reglas de negocio y limitar Nitro a proxy/orquestación.

### Cloudflare y Better Auth

Nitro declara soporte cross-platform, incluido Cloudflare Workers ([Nuxt: Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering#edge-side-rendering)), y Cloudflare publica su guía de despliegue de Nuxt con Workers Assets ([Cloudflare: Nuxt](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/nuxt/)). El acceso al binding debe hacerse desde contexto servidor/Nitro, con prueba temprana de tipado y preview local.

Better Auth documenta handler Nitro catch-all, cliente Vue reactivo, sesión SSR con `useFetch`, middleware de página y protección de rutas servidor ([Better Auth: Nuxt](https://better-auth.com/docs/integrations/nuxt)). Es integración real, no una suposición.

### Madurez, DX, lock-in y migración

- Nuxt es un framework mantenido y versionado activamente sobre Vue; el repositorio y releases son públicos ([nuxt/nuxt](https://github.com/nuxt/nuxt), [releases](https://github.com/nuxt/nuxt/releases)).
- SFC de Vue se parece bastante al modelo `.astro`: template, script y style en un archivo. La conversión visual es mecánica; los scripts DOM se reescriben como bindings/eventos/computed.
- Auto-imports, convenciones de directorios, Nitro y módulos elevan productividad, pero también crean “magia” y APIs específicas. La vista queda ligada a Vue y la capa servidor a Nitro.
- Riesgo principal: introducir un ecosistema nuevo sin una ventaja operacional decisiva sobre React Router/SvelteKit. Otro riesgo es usar simultáneamente demasiadas capas (`useFetch` → Nitro → Hono) y ocultar límites de caché/auth.

**Veredicto:** opción segura y productiva; primera elección solo con preferencia organizacional por Vue.

---

## Next.js 16 (App Router)

### SSR, SEO y metadata

Es el sistema SEO más completo del grupo. Admite metadata estática, `generateMetadata`, convenciones para favicon, robots, sitemap y OG/Twitter, y generación dinámica de imágenes ([Next.js: Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)). La metadata dinámica puede hacer streaming, pero Next desactiva ese comportamiento para bots que esperan `<head>` bloqueante; es una solución explícita a compatibilidad SEO.

Server Components son el valor diferencial: componentes servidor reducen JS cliente y los Client Components delimitan interactividad ([Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)). Sin embargo, para un dashboard muy interactivo muchos subárboles terminarán marcados `"use client"`, reduciendo parte de esa ventaja y añadiendo una frontera mental/serializable que Astro no tiene hoy.

### Estado y formularios

React ofrece el ecosistema más amplio para estado, tablas, editores y formularios. Next promueve Server Actions para mutations/forms ([Next.js: Forms](https://nextjs.org/docs/app/guides/forms)). En Recetario, donde Hono ya es el backend, hay dos alternativas:

1. Client Components llaman a la API mediante una ruta del frontend que usa el service binding.
2. Server Actions actúan como BFF y llaman al binding.

La segunda integra bien pending/revalidation, pero incrementa lock-in a Next y crea dos capas de mutación. No conviene mover lógica de dominio fuera de Hono.

### Cloudflare Workers: la objeción decisiva

La propia documentación de Next dice que el mínimo universal para fidelidad completa es **un servidor Node.js**, y que Server Components, PPR, Cache Components y Server Actions requieren distintas capacidades de streaming/caché; además distingue fidelidad funcional de fidelidad de rendimiento ([Next.js: Deploying to Platforms](https://nextjs.org/docs/app/guides/deploying-to-platforms)). Cloudflare Workers no ejecuta `next start`: necesita una adaptación.

Cloudflare mantiene una guía para Next.js y documenta SSR, CSR, generación estática, RSC, Server Actions, route handlers y middleware ([Cloudflare: Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)). OpenNext para Cloudflare expone bindings mediante `getCloudflareContext().env`, genera tipos con Wrangler y soporta emulación/bindings remotos en desarrollo ([OpenNext Cloudflare: Bindings](https://opennext.js.org/cloudflare/bindings)). Es viable, incluido el service binding `API`, pero agrega:

- otra versión crítica que coordinar con Next y Wrangler;
- diferencias entre `next dev` y preview real en `workerd`;
- una capa de traducción para caching, imágenes, middleware y runtime;
- riesgo de rezago tras releases mayores de Next.

El API público de deployment adapters de Next mejora la situación y reduce hooks privados ([Next.js: Adapters](https://nextjs.org/docs/app/api-reference/adapters)), pero no elimina la complejidad inherente.

### Better Auth, madurez y lock-in

Better Auth tiene la guía más profunda para Next: route handler, cliente React, RSC, Server Actions, cookie plugin y protección de rutas ([Better Auth: Next.js](https://better-auth.com/docs/integrations/next)). También advierte que RSC no puede refrescar cookies por sí solo y que el check de mera existencia de cookie no es autorización; la sesión debe validarse en servidor.

Next y React maximizan disponibilidad de librerías, experiencia transferible y contratación. El repositorio y releases son públicos y continuos ([vercel/next.js](https://github.com/vercel/next.js), [releases](https://github.com/vercel/next.js/releases)). Pero la madurez del ecosistema no equivale a simplicidad: App Router combina RSC, cachés, invalidación, Server Actions, boundaries cliente/servidor y convenciones de plataforma. El lock-in semántico es el mayor del grupo si se adoptan profundamente esas funciones.

Migrar `.astro` a TSX es directo para HTML simple, pero exige traducir `class`/atributos, bucles/condicionales, slots y scripts; luego hay que decidir componente por componente la frontera server/client. Es más trabajo conceptual que Vue o Svelte.

**Veredicto:** excelente framework, pero no el mejor ajuste operativo a un Worker Cloudflare con backend Hono separado. Elegir solo si su escala de ecosistema/organización compensa explícitamente el adaptador y la complejidad.

---

## SvelteKit 2

### SSR, SEO y metadata

SvelteKit renderiza en servidor por defecto y luego hidrata; permite controlar `prerender`, `ssr` y `csr` por página/layout. La documentación usa exactamente el patrón relevante: marketing prerenderizado, páginas dinámicas SSR para SEO y admin como SPA ([SvelteKit: Page options](https://svelte.dev/docs/kit/page-options)). Desactivar `csr` evita enviar JS en páginas puramente públicas.

Metadata se expresa con `<svelte:head>` y HTML normal; es menos estructurada y menos rica “de fábrica” que Next/Nuxt, pero suficiente. El SEO depende de SSR, títulos/descripciones únicos, URLs y rendimiento; SvelteKit documenta su modo híbrido como base ([SvelteKit: SEO](https://svelte.dev/docs/kit/seo)). Robots, sitemap y OG dinámico requieren rutas/utilidades propias o paquetes.

### Reactividad, estado y formularios

Es el ajuste de código más natural para Astro: `.svelte` mantiene markup, script y style en un archivo, pero convierte interpolaciones/eventos en reactividad real. Los scripts DOM actuales pueden desaparecer a favor de estado local y bindings, con menos boilerplate que React.

Las form actions son maduras, funcionan sin JS y se mejoran progresivamente con `use:enhance`; devuelven errores tipados/serializables, reejecutan `load` y manejan pending/focus/redirect ([SvelteKit: Form actions](https://svelte.dev/docs/kit/form-actions)). Esto encaja especialmente bien en auth, settings, ingredientes y editores.

Riesgo actual: la documentación dice que form actions seguirán funcionando, pero el desarrollo nuevo se centra en **remote functions**, aún experimentales. No conviene migrar Recetario a esa API experimental; usar form actions y un cliente server-only al Worker Hono.

SvelteKit advierte no guardar estado de usuario en variables globales del servidor y explica cómo transportar estado por `locals`/contexto ([SvelteKit: State management](https://svelte.dev/docs/kit/state-management)). Es relevante en isolates de Workers.

### Cloudflare y Better Auth

`@sveltejs/adapter-cloudflare` es oficial, soporta Workers y Pages, expone `platform.env` y puede generar tipos/configuración de plataforma; el antiguo adapter específico Workers está deprecado a favor de este ([SvelteKit: adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare), [Adapters](https://svelte.dev/docs/kit/adapters)). El service binding se consume directamente como `event.platform.env.API.fetch(...)` dentro de `+page.server.ts`, actions, hooks o endpoints. Es el camino más corto junto con React Router.

Better Auth ofrece integración oficial mediante `hooks.server.ts`, `event.locals`, plugin de cookies para server actions y cliente Svelte reactivo ([Better Auth: SvelteKit](https://better-auth.com/docs/integrations/svelte-kit)).

### Madurez, ecosistema y riesgos

SvelteKit tiene repositorio, releases y adapters oficiales públicos ([sveltejs/kit](https://github.com/sveltejs/kit), [releases](https://github.com/sveltejs/kit/releases)). Su arquitectura usa Web APIs y adapters, lo que favorece portabilidad. El lock-in de sintaxis Svelte existe, pero loaders/actions/adapters son conceptos sencillos y la lógica de dominio seguiría en paquetes TS/Hono.

La desventaja empresarial real no es técnica sino de opcionalidad: menos desarrolladores y menos integraciones específicas que React. Además, Svelte 5 introdujo runes y SvelteKit está explorando remote functions; aunque las APIs actuales siguen documentadas, hay más riesgo de evolución idiomática que en React básico.

**Veredicto:** mejor opción puramente técnica para la reescritura y Cloudflare. Queda segunda por riesgo de talento/ecosistema; puede ser primera para un equipo pequeño que controle la contratación y valore simplicidad.

---

## React Router 8 en Framework Mode

> React Router Framework Mode es el sucesor del modelo full-stack de Remix; no se evalúa aquí el router declarativo usado solo dentro de una SPA. React Router documenta tres modos y sus distintas capacidades ([Picking a Mode](https://reactrouter.com/start/modes)).

### SSR, SEO y metadata

Framework Mode soporta SSR global más prerender de rutas concretas; también client loaders cuando una parte debe cargar solo en browser ([React Router: Rendering Strategies](https://reactrouter.com/start/framework/rendering)). Para Recetario: SSR/prerender para landing/precios/legal; SSR autenticado para primer render privado si aporta UX; navegación cliente después.

Cada route module puede exportar `links`, headers y metadata. En React 19 la documentación recomienda `<title>` y `<meta>` nativos sobre el export `meta`; el export anterior sigue disponible, pero reemplaza —no mezcla— el array del padre ([React Router: Route Module](https://reactrouter.com/start/framework/route-module#meta)). Es funcional pero menos automatizado que Next: sitemap, robots y OG dinámico se implementan como resource routes o utilidades propias.

### Datos, reactividad y formularios

El modelo es particularmente adecuado para un backend separado:

- `loader` servidor llama `env.API.fetch` para HTML inicial;
- `action` servidor llama al mismo binding para mutaciones;
- `<Form>` y `fetcher.Form` degradan a semántica web y exponen estados pendientes;
- al terminar una action, React Router revalida loaders automáticamente ([Actions](https://reactrouter.com/start/framework/actions));
- loaders/actions servidor se eliminan del bundle cliente y las rutas tienen code splitting automático ([Route Module](https://reactrouter.com/start/framework/route-module)).

Esto reemplaza una cantidad importante de infraestructura DOM casera (overlays, estados mutation-pending, soft navigation e invalidación manual) por primitivas de framework. React state/context cubre estado efímero; loader data cubre estado servidor. Añadir un store global debería ser una decisión excepcional, no el punto de partida.

### Cloudflare y service bindings

Cloudflare mantiene la integración de React Router con su Vite plugin como experiencia first-class ([Cloudflare: React Router](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/)). React Router, a su vez, enlaza la guía/template de Cloudflare desde su documentación oficial ([Deploying](https://reactrouter.com/start/framework/deploying#cloudflare-workers)). El runtime usa Web Streams/Fetch y permite que el contexto Worker lleve bindings a loaders/actions. Esto mantiene visible la arquitectura actual en lugar de esconderla tras un modelo Node emulado.

La prueba de concepto debe verificar:

1. tipado `Env` generado por Wrangler;
2. inyección de `env.API` en `getLoadContext`/contexto de routes;
3. cookies Better Auth al atravesar web → binding → API;
4. preview local en runtime Workers, no solo Vite browser;
5. límites de bundle y compatibilidad de dependencias npm.

### Better Auth, madurez y uso empresarial

Better Auth documenta route resource catch-all, handler basado en `Request`, cliente React y flujo de signup/signin para React Router ([Better Auth: React Router](https://better-auth.com/docs/integrations/react-router)). Como Better Auth ya está en un paquete compartido/API, conviene conservar una sola autoridad de sesión y pasar headers/cookies al service binding; montar un segundo auth completo en el frontend crearía inconsistencias.

React Router lleva muchos años siendo infraestructura central del ecosistema React y su repositorio mantiene releases y gobernanza abierta ([remix-run/react-router](https://github.com/remix-run/react-router), [Contributing/Open Governance](https://reactrouter.com/community/contributing)). La evidencia útil para empresa es concreta: API pública, TypeScript generado por ruta, estrategia de upgrades con future flags y templates mantenidos por proveedores ([Updating from v7](https://reactrouter.com/upgrading/v7), [Deploying](https://reactrouter.com/start/framework/deploying)). No garantiza soporte comercial, pero reduce dependencia de una sola nube.

### DX, lock-in, migración y riesgos

- Menos magia y menos subsistemas de caché que Next; a cambio, más decisiones propias para imágenes, sitemap, caché y organización.
- TSX requiere más transformación de templates Astro que Svelte/Vue. No hay conversión automática fiable para los 65 componentes.
- Los scripts DOM deben **reescribirse**, no pegarse en `useEffect`; hacerlo conservaría fragilidad e introduciría problemas de hidratación.
- Lock-in moderado: JSX/hooks atan la vista a React, pero `Request`/`Response`, loaders/actions y Vite son más portables que RSC/Server Actions de Next.
- React Router 8 eleva baselines (React 19, Vite moderno, ESM); debe validarse compatibilidad con paquetes internos y toolchain ([React Router](https://reactrouter.com/)).
- Riesgo de nomenclatura/evolución tras la convergencia Remix → React Router. La ruta de upgrade con flags reduce, no elimina, ese riesgo.

**Veredicto:** mejor balance de interactividad, talento/ecosistema, modelo web, Cloudflare directo y portabilidad.

---

## Comparación de migración desde Astro

### Qué se conserva

- Tailwind/CSS y diseño visual, con ajustes de sintaxis.
- TypeScript puro, Zod, tipos de `packages/*` y clientes HTTP.
- Hono y contratos del API.
- Better Auth como autoridad, siempre que las cookies/headers se reenvíen correctamente.
- Monorepo pnpm y despliegues separados.

### Qué debe reescribirse en todos los casos

Los archivos `.astro` no son componentes portables de runtime. Hay que convertir frontmatter, props/slots, layouts, condiciones/bucles y scripts. Sobre todo, los scripts que consultan el DOM, registran listeners o sincronizan atributos deben transformarse en estado declarativo.

| Astro actual | Nuxt | Next.js | SvelteKit | React Router |
|---|---|---|---|---|
| frontmatter server | `script setup` + `useAsyncData` | Server Component/loader propio | `+page.server.ts` / `load` | route `loader` |
| layout/slot | layout Vue + `<slot>` | layout TSX + `children` | `+layout.svelte` + snippet/children | ruta layout + `<Outlet>` |
| script DOM | refs/computed/directives | hooks/estado en Client Component | runes/bindings/actions | hooks/estado React |
| POST/fetch manual | server route/composable | Server Action/route handler | action + `enhance` | action + Form/fetcher |
| metadata | `useSeoMeta` | Metadata API | `<svelte:head>` | `<title>/<meta>` o `meta` |

### Estrategia de migración recomendada

No hacer un big bang de 65 componentes. Crear un **vertical slice** con una ruta pública y una privada compleja:

1. landing o pricing: SSR/prerender, metadata, canonical, OG, assets;
2. listado de recetas: auth, loader por service binding, pending/error;
3. detalle/editor de receta: formularios, mutaciones, revalidación y estado local;
4. flujo Better Auth completo y billing callback;
5. pruebas en `workerd`, no únicamente dev server.

Usar ese slice para medir bundle, cold start, navegación, complejidad de tipos y número de líneas de glue. Solo después congelar nuevas features en Astro y migrar por rutas.

No intentaría ejecutar Astro y el framework nuevo dentro del mismo Worker. Durante transición, usaría routing por hostname/path entre dos Workers o migración por despliegue completo una vez alcanzada paridad, para no mezclar dos runtimes e hidrataciones.

---

## Riesgos transversales y mitigaciones

1. **Duplicar el backend.** Loaders/actions/server routes pueden atraer lógica de negocio. Mitigación: Hono conserva autorización y dominio; frontend solo adapta transporte y UX.
2. **Confiar en middleware para seguridad.** Redirect de UI no sustituye autorización. Better Auth advierte que comprobar solo una cookie no valida sesión ([Better Auth: Next.js, Auth Protection](https://better-auth.com/docs/integrations/next#auth-protection)). Mitigación: validar cada operación en `apps/api`.
3. **Cookies a través del binding.** Un binding no arregla scopes, `Set-Cookie` o forwarding. Mitigación: tests end-to-end de login, refresh, logout y CSRF/origin.
4. **Diferencias dev/runtime.** Node/Vite puede aceptar APIs que Workers no. Mitigación: CI con build y preview Wrangler/workerd, además de browser tests.
5. **Hidratación.** Código dependiente de `window`, timestamps o DOM puede divergir. Mitigación: aislar browser-only y eliminar manipulación imperativa.
6. **Caché de datos privados.** Evitar compartir respuestas personalizadas en CDN/framework cache. Defaults explícitos `private/no-store`, claves por usuario solo si son imprescindibles.
7. **Lock-in de Cloudflare.** Encapsular `env.API.fetch`; mantener interfaz alternativa HTTP y contratos compartidos.
8. **Coste de reescritura.** El framework no convierte comportamiento defectuoso en correcto. Migrar por funcionalidades con pruebas de paridad.

---

## Decisión franca

### Elegir ahora: React Router Framework Mode

Es la elección más defendible para uso empresarial de Recetario porque reduce el riesgo conjunto, no porque gane cada categoría:

- React aporta la mayor opcionalidad de librerías y contratación.
- Framework Mode aporta SSR/prerender sin imponer el modelo RSC/cachés de Next.
- Loaders/actions/forms/fetchers encajan con Hono detrás de service binding.
- Cloudflare mantiene el camino de despliegue y el runtime es cercano a Web APIs.
- El lock-in queda principalmente en React para UI y Cloudflare para transporte, ambos encapsulables.

### Condiciones que cambiarían la decisión

- **SvelteKit** si el equipo es pequeño/estable, puede asumir contratación especializada y prioriza máxima sencillez de componentes y forms. En ese escenario lo elegiría incluso sobre React Router.
- **Nuxt** si ya existe experiencia Vue relevante, librería corporativa Vue o mandato de plataforma Vue/Nitro.
- **Next.js** si la organización ya estandariza Next, necesita compartir componentes/equipo, o considera RSC, Metadata API, imágenes y ecosistema más valiosos que la simplicidad en Workers. Exigiría antes una PoC de OpenNext/adapter con service bindings, Better Auth, streaming, caché y upgrade rehearsal.
- **No migrar de Astro todavía** si los scripts DOM problemáticos son pocos. Astro admite componentes de frameworks como islas; adoptar React/Svelte/Vue solo en la superficie privada podría costar menos que reescribir todo. La migración completa solo se justifica si la interacción ya domina la mayoría del frontend y la doble arquitectura Astro + scripts se ha vuelto el principal coste de mantenimiento.

## Próximo paso propuesto

PoC de una semana con React Router, sin tocar la app Astro existente:

- Worker frontend mínimo con Cloudflare Vite plugin;
- binding tipado a `apps/api`;
- `/pricing` prerender/SSR con metadata;
- `/recipes` protegido con loader;
- una mutación con `fetcher.Form` y revalidación;
- Better Auth login/logout/session;
- Playwright sobre preview Workers;
- registro de tamaño de bundle, latencia local, errores de compatibilidad y complejidad del glue.

Si la PoC falla por integración Cloudflare/contexto o resulta excesivamente verbosa, repetir el mismo slice en SvelteKit; no saltar directamente a Next.js.

---

## Fuentes primarias consultadas

### Cloudflare

- [Workers: Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [Workers: Service bindings RPC](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/)
- [Framework guide: React Router](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/)
- [Framework guide: Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Framework guide: Nuxt](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/nuxt/)

### Nuxt

- [Rendering Modes](https://nuxt.com/docs/4.x/guide/concepts/rendering)
- [SEO and Meta](https://nuxt.com/docs/4.x/getting-started/seo-meta)
- [State Management](https://nuxt.com/docs/4.x/getting-started/state-management)
- [Repositorio oficial](https://github.com/nuxt/nuxt)

### Next.js / OpenNext

- [Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Forms](https://nextjs.org/docs/app/guides/forms)
- [Deploying to Platforms](https://nextjs.org/docs/app/guides/deploying-to-platforms)
- [Deployment Adapters](https://nextjs.org/docs/app/api-reference/adapters)
- [OpenNext Cloudflare: Bindings](https://opennext.js.org/cloudflare/bindings)
- [Repositorio oficial](https://github.com/vercel/next.js)

### SvelteKit

- [Page options](https://svelte.dev/docs/kit/page-options)
- [Form actions](https://svelte.dev/docs/kit/form-actions)
- [State management](https://svelte.dev/docs/kit/state-management)
- [SEO](https://svelte.dev/docs/kit/seo)
- [adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare)
- [Repositorio oficial](https://github.com/sveltejs/kit)

### React Router

- [Picking a Mode](https://reactrouter.com/start/modes)
- [Route Module](https://reactrouter.com/start/framework/route-module)
- [Rendering Strategies](https://reactrouter.com/start/framework/rendering)
- [Actions](https://reactrouter.com/start/framework/actions)
- [Deploying](https://reactrouter.com/start/framework/deploying)
- [Updating from v7](https://reactrouter.com/upgrading/v7)
- [Repositorio oficial](https://github.com/remix-run/react-router)

### Better Auth

- [Nuxt Integration](https://better-auth.com/docs/integrations/nuxt)
- [Next.js Integration](https://better-auth.com/docs/integrations/next)
- [SvelteKit Integration](https://better-auth.com/docs/integrations/svelte-kit)
- [React Router Integration](https://better-auth.com/docs/integrations/react-router)
