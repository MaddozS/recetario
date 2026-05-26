# Feature Specification: KitchCalc Landing Page

**Feature Branch**: `001-landing-page-spec`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "KitchCalc Landing Page - La landing page de KitchCalc se enfoca en mostrar las capacidades del software de manera resumida pero atractiva, mostrando lo que los usuarios pueden lograr con la app. Pese a ser una app relacionada con la cocina el enfoque no es anotar solo recetas, si no mostrarle a los emprendedores y cocineros que venden sus productos como el software el ayuda a calcular de manera eficiente los costos y sus ganacias."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitante descubre el software (Priority: P1)

Un emprendedor gastronómico llega a la landing page, entiende en segundos de qué trata KitchCalc, visualiza sus funcionalidades principales y comprende el valor del software para calcular costos de recetas.

**Why this priority**: Es el flujo principal de la landing page. Si un visitante no entiende la propuesta de valor en los primeros segundos, la página falla en su propósito fundamental.

**Independent Test**: Puede probarse visitando la página principal y verificando que cada sección (Hero, Funciones, Cómo funciona, Precios, CTA) sea visible, comprensible y navegable sin necesidad de registrarse.

**Acceptance Scenarios**:

1. **Given** un visitante llega a la landing page, **When** la página carga, **Then** ve el Hero con el icono de la aplicación, un titular que comunica la propuesta de valor ("Calcula el costo real de tus recetas"), un subtítulo explicativo, y una tarjeta animada de ejemplo de costeo.

2. **Given** un visitante en el Hero, **When** hace clic en "Comenzar gratis", **Then** es redirigido al flujo de registro/inicio de sesión.

3. **Given** un visitante en el Hero, **When** hace clic en "Conocer más", **Then** la página hace scroll suave a la sección de Funciones.

4. **Given** un visitante navega la landing, **When** hace scroll, **Then** los elementos se revelan con animaciones progresivas y la navegación del navbar se actualiza para reflejar la sección activa.

---

### User Story 2 - Visitante explora funcionalidades del software (Priority: P1)

El visitante descubre las capacidades principales de la aplicación a través de la sección de Funciones, entendiendo cómo KitchCalc resuelve problemas concretos de costeo.

**Why this priority**: Demostrar valor funcional es esencial para convertir visitantes en usuarios registrados.

**Independent Test**: Puede probarse navegando a la sección #features y verificando que las tres funcionalidades (costeo con márgenes, gestión de ingredientes, planificador de producción) se muestren con imágenes representativas y puedan ampliarse al hacer clic.

**Acceptance Scenarios**:

1. **Given** un visitante en la sección de Funciones, **When** observa cada funcionalidad, **Then** ve una descripción clara, icono representativo y captura de pantalla de la app en acción.

2. **Given** un visitante en la sección de Funciones, **When** hace clic en una imagen de funcionalidad, **Then** se abre un lightbox (diálogo modal) con la imagen ampliada y fondo semitransparente.

3. **Given** un visitante con el lightbox abierto, **When** hace clic fuera de la imagen o presiona Escape, **Then** el lightbox se cierra.

---

### User Story 3 - Visitante entiende el flujo de trabajo (Priority: P2)

El visitante comprende el proceso de tres pasos para usar KitchCalc: registrar ingredientes, crear recetas y optimizar precios.

**Why this priority**: Explicar el "cómo funciona" reduce la fricción y aumenta la confianza del usuario antes de registrarse.

**Independent Test**: Puede probarse navegando a la sección #how-it-works y verificando que los tres pasos se muestren con ejemplos numéricos concretos del ahorro/beneficio.

**Acceptance Scenarios**:

1. **Given** un visitante en la sección "Cómo funciona", **When** revisa el contenido, **Then** ve tres pasos numerados con ejemplos de precios y costos en formato monospace.

2. **Given** un visitante hace scroll a la sección, **When** los pasos aparecen en pantalla, **Then** se muestran con una animación escalonada de revelación.

---

### User Story 4 - Visitante compara planes de precios (Priority: P2)

El visitante explora los planes Free, Basic y Pro, compara sus características y precios (mensuales y anuales), y entiende qué plan se ajusta a sus necesidades.

**Why this priority**: La transparencia de precios es clave para la conversión. Un visitante debe poder tomar una decisión informada.

**Independent Test**: Puede probarse navegando a #pricing y verificando que los tres planes se muestren con sus características, precios mensuales/anuales, y que el toggle funcione correctamente.

**Acceptance Scenarios**:

1. **Given** un visitante en la sección de Precios, **When** la página carga, **Then** ve tres tarjetas de plan (Free, Basic, Pro) con sus precios, características (con check, X o reloj según disponibilidad) y botón de acción.

2. **Given** un visitante en la sección de Precios, **When** alterna entre mensual y anual, **Then** los precios se actualizan para mostrar el costo anual correspondiente.

3. **Given** un visitante no autenticado, **When** hace clic en "Comenzar gratis" en el plan Free, **Then** es redirigido al flujo de registro.

4. **Given** un visitante no autenticado, **When** hace clic en "Elegir Basic" o "Elegir Pro", **Then** es redirigido al registro con intención de compra.

---

### User Story 5 - Visitante se registra desde la landing (Priority: P3)

Un visitante convencido por el contenido de la landing procede a registrarse a través de los llamados a la acción (CTA) distribuidos estratégicamente.

**Why this priority**: Es la acción de conversión principal, pero depende de que los flujos anteriores sean exitosos.

**Independent Test**: Puede probarse verificando que todos los CTAs ("Comenzar gratis", "Ver planes") redirijan correctamente a los flujos de registro o secciones correspondientes.

**Acceptance Scenarios**:

1. **Given** un visitante al final de la página en la sección CTA, **When** hace clic en "Comenzar gratis", **Then** es redirigido al registro.

2. **Given** un visitante al final de la página, **When** hace clic en "Ver planes", **Then** la página hace scroll suave a la sección de Precios.

3. **Given** un visitante en cualquier sección, **When** hace clic en el botón "Comenzar gratis" del navbar (sticky), **Then** es redirigido al registro.

---

### Edge Cases

- ¿Qué sucede cuando no hay conexión a internet? La página debe cargar completamente desde el servidor (SSR) y ser funcional sin JavaScript para el contenido estático.
- ¿Cómo se comporta el toggle mensual/anual cuando los precios de Stripe no están disponibles? Los precios deben mostrar valores por defecto o indicar que no están disponibles temporalmente.
- ¿Qué ocurre cuando un usuario ya autenticado llega a la landing? El navbar debe mostrar "Ir a la app" en lugar de "Comenzar gratis".
- ¿Cómo se manejan las imágenes en modo oscuro vs claro? Cada captura de pantalla debe tener su versión para cada tema.
- ¿Qué pasa si el navegador no soporta elementos `<dialog>` para el lightbox? Debe degradarse gracefulmente manteniendo la imagen visible.
- ¿Cómo se comportan las animaciones de revelación en navegadores con prefers-reduced-motion? Deben desactivarse o simplificarse.
- ¿Qué sucede en pantallas muy pequeñas (< 360px)? El diseño debe ajustarse sin romperse, con scroll horizontal en la sección de precios si es necesario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEBE mostrar un Hero con el logo/icono de KitchCalc, un titular principal, subtítulo, y un ejemplo visual animado de costeo de recetas.
- **FR-002**: Sistema DEBE incluir un navbar fijo en la parte superior con enlaces a Funciones, Cómo funciona, Precios, y un botón CTA "Comenzar gratis".
- **FR-003**: Sistema DEBE actualizar el enlace activo del navbar según la sección visible (scroll spy).
- **FR-004**: Sistema DEBE incluir una sección "Funciones" con tres funcionalidades destacadas: costeo con márgenes, gestión de ingredientes y planificador de producción, cada una con imagen descriptiva.
- **FR-005**: Sistema DEBE permitir ampliar las imágenes de funcionalidades mediante un lightbox (modal accesible).
- **FR-006**: Sistema DEBE incluir una sección "Cómo funciona" con un proceso de tres pasos que incluya ejemplos numéricos concretos.
- **FR-007**: Sistema DEBE incluir una sección de "Precios" con tres planes (Free, Basic, Pro) mostrando características, precios mensuales y anuales, y botones de acción.
- **FR-008**: Sistema DEBE permitir alternar entre precios mensuales y anuales mediante un toggle funcional.
- **FR-009**: Sistema DEBE incluir una sección CTA al final de la página con llamado a la acción "Comenzar gratis" y enlace a "Ver planes".
- **FR-010**: Sistema DEBE incluir un footer con enlaces a Funciones, Cómo funciona, Precios, Iniciar sesión, Registrarse, Privacidad y Términos.
- **FR-011**: Sistema DEBE adaptarse a tres tamaños de pantalla: móvil, tablet y desktop con layout responsivo.
- **FR-012**: Sistema DEBE soportar modo oscuro y modo claro para todas las secciones, incluyendo imágenes temáticas.
- **FR-013**: Sistema DEBE animar la entrada de elementos al hacer scroll con efecto de revelación progresiva.
- **FR-014**: Sistema DEBE incluir meta tags SEO (título, descripción, Open Graph) en español orientados a emprendedores gastronómicos.
- **FR-015**: Sistema DEBE redirigir a usuarios autenticados a la aplicación en lugar de mostrar CTAs de registro.
- **FR-016**: Sistema DEBE cargar precios dinámicamente desde Stripe, con fallback a valores por defecto si la sincronización falla.
- **FR-017**: Sistema DEBE incluir navegación móvil con menú desplegable (drawer) accesible por teclado y con soporte para tecla Escape.

### Key Entities *(include if feature involves data)*

- **PricingPlan**: Representa un plan de suscripción con nombre, precio (mensual/anual), lista de características por disponibilidad, y badge promocional. Los datos se componen desde Stripe (precios) y configuración local (características).
- **FeatureFlag**: Indica si una funcionalidad está disponible (✅), no disponible (❌), o próximamente (🔜) para cada plan. Se define en configuración local.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La landing page carga completamente en menos de 3 segundos en conexiones 4G simuladas.
- **SC-002**: Un visitante puede entender la propuesta de valor de KitchCalc en menos de 10 segundos desde que llega al Hero.
- **SC-003**: Un visitante puede navegar por todas las secciones (Hero, Funciones, Cómo funciona, Precios, CTA) en menos de 30 segundos.
- **SC-004**: La página obtiene un puntaje de rendimiento Lighthouse superior a 80 en mobile y 90 en desktop.
- **SC-005**: Todos los CTAs ("Comenzar gratis") redirigen correctamente al flujo de registro sin errores.
- **SC-006**: La página es navegable completamente con teclado (Tab, Enter, Escape) en todas las secciones interactivas.
- **SC-007**: La alternancia entre modo oscuro y claro persiste correctamente entre sesiones del mismo navegador.
- **SC-008**: El toggle de precios mensual/anual actualiza todos los precios visiblemente sin recargar la página.

## Assumptions

- Los visitantes tienen conexión a internet estable (la página requiere JS para animaciones e interactividad avanzada).
- Los precios de los planes se sincronizan desde Stripe y están disponibles en la base de datos local.
- Los usuarios acceden mayormente desde dispositivos móviles y desktop, con énfasis en móvil primero.
- El contenido de la landing está en español para el mercado hispanohablante.
- Las imágenes de funcionalidades existen en versiones para modo claro y oscuro.
- El sistema de autenticación existente maneja el registro y redirección de usuarios.
- No se requiere soporte multi-idioma en la versión inicial.
- Las animaciones son un refuerzo visual, no un requisito funcional crítico.
