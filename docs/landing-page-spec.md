# KitchCalc Landing Page — Especificación

## 1. Propósito

La landing page de KitchCalc debe comunicar el valor del software a **emprendedores y cocineros que venden sus productos**. El enfoque principal no es "anotar recetas", sino **calcular costos, márgenes y rentabilidad** de manera eficiente.

## 2. Stack técnico

- **Framework**: Astro 6 (SSR con `@astrojs/vercel`)
- **Layout**: `LandingLayout.astro` (`/src/layouts/LandingLayout.astro`)
- **Componentes**: Todos en `/src/components/landing/`
- **UI primitives**: `Button`, `Card`, `Badge`, `SectionHeading` desde `@/components/ui`
- **Iconos**: `astro-icon` con set `lucide:*`
- **Tipografía**: Outfit (display), JetBrains Mono (mono), system-ui (sans)
- **Accent**: Coral fijo (`getAccentCssVars("coral", theme)`)
- **Tema**: Light/dark toggle guardado en `localStorage` + cookie `landing_theme`
- **Animaciones**: `IntersectionObserver` scroll-reveal con clases `[data-reveal]` / `.reveal-item`
- **Ruta**: `/` → `src/pages/index.astro`

## 3. Estructura general

```
LandingLayout
├── <head>: SEO, Google Fonts, ClientRouter, theme inline script
├── Skip-to-content link
└── <body>
    ├── LandingNavbar (fixed top, z-50)
    ├── <main id="main-content">
    │   ├── HeroSection
    │   ├── FeaturesSection
    │   ├── HowItWorksSection
    │   ├── PricingSection
    │   └── CTASection
    └── LandingFooter
```

## 4. Secciones

### 4.1 LandingNavbar (`/src/components/landing/LandingNavbar.astro`)

| Elemento | Detalle |
|---|---|
| Posición | Fixed top, `h-16`, borde inferior, bg-background con sombra |
| Logo | `kitchcalc_logo.svg` + "KitchCalc" (texto visible solo sm+) |
| Nav links (desktop) | Funciones → `#features`, Cómo funciona → `#how-it-works`, Precios → `#pricing` |
| Scroll spy | `IntersectionObserver` agrega `text-accent-600` al link activo (threshold 0.5) |
| Theme toggle | Botón sun/moon, llama `window.toggleLandingTheme()` |
| CTA | `Button variant="primary"` — "Comenzar gratis" o "Ir a la app" |
| Mobile menu | Panel slide-in desde izquierda con backdrop, animación 250ms `cubic-bezier(0.16, 1, 0.3, 1)` |

### 4.2 HeroSection (`/src/components/landing/HeroSection.astro`)

| Elemento | Detalle |
|---|---|
| Altura | `min-h-[85vh]` (sm: `min-h-screen`) |
| Fondo | Gradientes radiales con `--aw-accent-200/300` + patrón de líneas diagonales |
| Headline | "Calcula el costo real **de tus recetas**" — `clamp(2.5rem, 7vw, 5.5rem)`, weight 900, tracking -0.03em |
| Subtexto | "KitchCalc te ayuda a calcular costos, márgenes y precios de venta. Gestiona ingredientes, stock y producción en un solo lugar." |
| CTAs | "Comenzar gratis" (`Button primary` → `/sign-in`), "Conocer más" (link → `#features`) |
| Card demo | Mini card con 3 filas: Costo base ($2.40), Margen 50% (+$1.20), Precio venta ($3.60) |
| Count-up | Animación numérica al hacer scroll (`data-count-up`, 800ms, `easeOutQuart`) |
| Logo | `kitchcalc_logo.svg` con glow `bg-accent-500/35` blur-3xl, visible solo en lg+ |
| Tag final | "Sin tarjeta de crédito. Prueba gratis." |

### 4.3 FeaturesSection (`/src/components/landing/FeaturesSection.astro`)

Subtítulo: "Todo lo que necesitas para costear". 3 features en alternancia left/right:

| Feature | Icono | Descripción |
|---|---|---|
| Costeo con márgenes | `lucide:calculator` | Calcula costo real con ingredientes, márgenes y precios sugeridos automáticamente |
| Gestión de ingredientes | `lucide:package-search` | Administra inventario con precios actualizados, unidades y stock disponible |
| Planificador de producción | `lucide:trending-up` | Planifica producción con multiplicadores de batch, costos por unidad y proyecciones de rentabilidad |

Cada feature tiene:
- Imagen light/dark para screenshot de la funcionalidad
- Lightbox dialog al hacer clic en la imagen (backdrop con blur, animación scale+fade)
- Scroll reveal alternado: `data-reveal="left"` / `data-reveal="right"`

### 4.4 HowItWorksSection (`/src/components/landing/HowItWorksSection.astro`)

Fondo: `bg-muted` con gradiente radial accent glow.

Header: "Cómo funciona" → "Del ingrediente al precio final" → "Tres pasos para tener el control de tus costos."

3 pasos numerados:

| # | Título | Descripción | Stat |
|---|---|---|---|
| 01 | Registra tus ingredientes | Carga con precios, unidades y proveedores. Costos automáticos. | `Harina: $15.00/kg · Azúcar: $23.56/kg` |
| 02 | Crea tus recetas | Agrega ingredientes con cantidades exactas. Costo base se actualiza al instante. | `3 ingredientes · $22.40 costo base` |
| 03 | Optimiza tus precios | Visualiza costos, márgenes y precios sugeridos. Ajusta y exporta. | `Precio sugerido: $33.60 con margen 50%` |

Cada paso tiene un badge numerado (accent bg) + stat card con `font-mono tabular-nums`.

### 4.5 PricingSection (`/src/components/landing/PricingSection.astro`)

Header: "Planes y precios" → "Elige el plan que mejor se adapte a tu negocio."

**Toggle**: Mensual / Anual (con badge "-20%"). Keyboard: ArrowLeft/ArrowRight.

Los planes se renderizan dinámicamente desde `getPricingPlans()` (BD vía Prisma).

| Plan | Estilo |
|---|---|
| Free | Card normal, CTA "Comenzar gratis" → `/sign-in` |
| Basic | Card normal, CTA → `/pricing` |
| Pro | Card con `plan-pro` pulse animation + `scale(1.05)` en lg+, borde accent, badge "Más popular" |

Cada plan muestra:
- Badge (solo Pro)
- Nombre + descripción
- Precio mensual/anual con toggle
- Feature list con iconos check (`text-success`), x (`text-subtle-foreground`), clock (coming soon)
- CTA link

Mobile: `snap-x snap-mandatory` scroll horizontal con `min-w-[280px]` cards. Scrollbar oculto.

### 4.6 CTASection (`/src/components/landing/CTASection.astro`)

Fondo: `bg-linear-to-br from-accent-500 via-accent-600 to-accent-700` con patrón cónico 3% opacity + radial glows.

Headline: "Empieza a calcular el costo real de tus recetas hoy"
Subtext: "Sin tarjeta de crédito. Configuración en segundos."

CTAs:
- "Comenzar gratis" → botón blanco con texto accent, sombra
- "Ver planes" → ghost border blanco/30%, `backdrop-blur-sm`

Textos: `text-text-on-accent` para contraste.

### 4.7 LandingFooter (`/src/components/landing/LandingFooter.astro`)

Dos columnas:
- **Branding**: Logo + descripción + links legales (Privacidad, Términos)
- **Producto**: Funciones, Cómo funciona, Precios
- **Acceso**: Iniciar sesión, Registrarse

Copyright dinámico con año actual.

## 5. Diseño visual

### 5.1 Sistema de colores (Coral)
| Token | Uso |
|---|---|
| `accent-50..700` | Backgrounds, botones, hover, decoration |
| `text-on-accent` | Texto sobre fondos accent (#ffffff) |
| `accent-200` (light) / `accent-300` (dark) | Hover shadows en cards |
| `accent-600` | Botones primarios, texto accent |

### 5.2 Sombras hover
| Elemento | Shadow |
|---|---|
| Card feature | `--card-hover-shadow` + translateY(-6px) + accent border |
| Pricing card | `--pricing-hover-shadow` + translateY(-4px) |
| Pricing Pro | `--pricing-pro-hover-shadow` + scale(1.05) + translateY(-4px) |

### 5.3 Animaciones
| Elemento | Tipo | Duración | Easing |
|---|---|---|---|
| Scroll reveal | fade + translateY(28px) / translateX(±30px) / scale(0.94→1) | 500ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Reveal items (stagger) | fade + translateY(20px) | 400ms | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Count-up hero | numérico | 800ms | `easeOutQuart` |
| Pricing pro pulse | box-shadow pulse | 2.5s loop | ease-in-out |
| Lightbox open | scale(0.92→1) + fade | 200ms | `--ease-out` |
| Mobile menu slide | translateX(-100%→0) | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |

### 5.4 Tipografía
| Uso | Font | Weight |
|---|---|---|
| Headings | Outfit | 900 (black) |
| Body | system-ui | 400/500/600 |
| Números/precios | JetBrains Mono | 500-800, `tabular-nums` |
| Labels | system-ui | 600-700, `tracking-widest` uppercase |

### 5.5 Responsive
| Breakpoint | Cambios |
|---|---|
| Base | Single column, stacked layout |
| sm (640px) | Hero full screen, botones en row |
| md (768px) | Features grid 2 cols, nav links visibles |
| lg (1024px) | Hero 2 cols (texto + logo), pricing 3 cols, scroll reveal activo |
| Pricing mobile | Snap scroll horizontal, cards `min-w-[280px]` |

## 6. SEO & Meta

| Tag | Value |
|---|---|
| title | KitchCalc \| Calcula el costo real de tus recetas |
| description | KitchCalc \| Calcula el costo real de tus recetas. Gestion de costos, margenes y precios para tu negocio de alimentos. |
| og:title | KitchCalc \| Calcula el costo real de tus recetas |
| og:description | Gestiona costos, márgenes y precios de tus recetas de forma simple y rápida. |
| og:image | /kitchcalc_logo.webp |
| twitter:card | summary_large_image |

## 7. Arquitectura de datos

La landing obtiene datos de:
- `getPricingPlans()` → `@/lib/db/billing` — planes desde PostgreSQL vía Prisma
- `Astro.locals.user` / `Astro.locals.session` — para determinar `isAuthenticated` (cambia CTAs y contenido)

## 8. Edge cases

| Condición | Comportamiento |
|---|---|
| Usuario autenticado | Navbar CTA → "Ir a la app" → `/recipes`. Free plan CTA → `/recipes` |
| Usuario no autenticado | CTAs → `/sign-in` o `/sign-up` |
| Tema oscuro | Hero gradient, cards hover shadows, pricing Pro glow, lightbox images se adaptan |
| prefers-reduced-motion | Todas las animaciones desactivadas, scroll reveal opaco inmediato |
| Sin planes en BD | PricingSection no renderiza planes, sección vacía |
| Error en fetch planes | La página falla silenciosamente (sin try-catch actual) |
| Mobile pricing scroll | Scroll horizontal con snap, fade-to-background en borde derecho |
| Navegación SPA | `astro:after-swap` re-binde scroll reveal, scroll spy, lightbox, mobile menu |

## 9. Componentes y archivos

| Archivo | Rol |
|---|---|
| `src/pages/index.astro` | Punto de entrada, composición de secciones |
| `src/layouts/LandingLayout.astro` | Layout global: head, temas, scroll reveal, animaciones |
| `src/components/landing/LandingNavbar.astro` | Navegación fixed + menú mobile |
| `src/components/landing/HeroSection.astro` | Hero con headline, CTA, card demo, count-up |
| `src/components/landing/FeaturesSection.astro` | 3 features con screenshots + lightbox |
| `src/components/landing/HowItWorksSection.astro` | 3 pasos con stats |
| `src/components/landing/PricingSection.astro` | Planes con toggle monthly/yearly |
| `src/components/landing/CTASection.astro` | CTA final con gradiente |
| `src/components/landing/LandingFooter.astro` | Footer con links y copyright |
| `src/lib/accent-colors.ts` | 7 familias de accent, función `getAccentCssVars` |
| `src/styles/global.css` | Tailwind v4, tokens semánticos, dark mode OKLCH |

## 10. Archivos multimedia

| Archivo | Propósito |
|---|---|
| `/kitchcalc_logo.svg` | Logo app (hero desktop, navbar, footer) |
| `/kitchcalc_logo.webp` | Favicon, apple-touch-icon, og:image |
| `/favicon.png` | Favicon PNG fallback |
| `/receta_light.webp` | Screenshot receta (light mode) |
| `/receta_dark.webp` | Screenshot receta (dark mode) |
| `/ingredientes_light.webp` | Screenshot ingredientes (light) |
| `/ingredientes_dark.webp` | Screenshot ingredientes (dark) |
| `/produccion_light.webp` | Screenshot producción (light) |
| `/produccion_dark.webp` | Screenshot producción (dark) |
