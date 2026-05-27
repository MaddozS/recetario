# Feature Specification: Página de Inicio de Sesión

**Feature Branch**: `004-sign-in-page`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "Página de inicio de sesión solo accesible sin sesión activa. Esquema de colores landing page. Opciones: email/contraseña y Google (solo cuentas existentes, sin auto-crear). Link a ¿olvidaste contraseña? y registro. Errores genéricos por seguridad."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicio de sesión con email y contraseña (Priority: P1)

Usuario con cuenta registrada accede a la página, ingresa su email y contraseña, y es autenticado exitosamente, siendo redirigido al área protegida de la aplicación.

**Why this priority**: Es el flujo principal de autenticación. Sin este flujo, los usuarios no pueden acceder a sus recetas.

**Independent Test**: Crear una cuenta de prueba, navegar a `/sign-in`, ingresar credenciales correctas y verificar redirección a `/recipes`.

**Acceptance Scenarios**:

1. **Given** usuario sin sesión activa, **When** ingresa email y contraseña correctos y envía el formulario, **Then** es redirigido a la URL del parámetro `redirect` (si es válida) o a `/recipes` por defecto, con sesión iniciada.
2. **Given** usuario sin sesión activa, **When** ingresa credenciales incorrectas (email no registrado o contraseña equivocada) y envía el formulario, **Then** ve un mensaje de error genérico: "Credenciales inválidas." sin revelar si el email existe o la contraseña fue el problema.
3. **Given** usuario sin sesión activa con cuenta no verificada, **When** intenta iniciar sesión con email y contraseña correctos, **Then** ve un mensaje indicando que debe verificar su email, con opción de reenviar correo de verificación.

---

### User Story 2 - Inicio de sesión con Google (solo cuentas existentes) (Priority: P2)

Usuario con cuenta previamente vinculada a Google inicia sesión usando el botón "Continuar con Google" y es redirigido al área protegida. Si la cuenta de Google no está vinculada a ninguna cuenta del sistema, se muestra un error sin crear cuenta nueva.

**Why this priority**: Segundo método de autenticación. La restricción de no auto-crear es un requisito de seguridad explícito.

**Independent Test**: Vincular una cuenta a Google, cerrar sesión, hacer clic en "Continuar con Google" y verificar redirección. Intentar con una cuenta de Google no vinculada y verificar que se muestra error sin crear cuenta.

**Acceptance Scenarios**:

1. **Given** usuario sin sesión activa con cuenta vinculada a Google, **When** hace clic en "Continuar con Google" y completa el flujo OAuth, **Then** es redirigido a la URL del parámetro `redirect` (si es válida) o a `/recipes` por defecto, con sesión iniciada.
2. **Given** usuario sin sesión activa sin cuenta vinculada a Google, **When** intenta iniciar sesión con Google, **Then** ve un mensaje de error indicando que no existe cuenta asociada a ese Google, y no se crea ninguna cuenta nueva.
3. **Given** usuario sin sesión activa, **When** el flujo de Google falla por error de red o configuración, **Then** ve un mensaje de error apropiado y puede reintentar.

---

### User Story 3 - Navegación a registro y recuperación de contraseña (Priority: P3)

Usuario que no tiene cuenta o olvidó su contraseña puede navegar a las páginas de registro o recuperación desde la página de inicio de sesión.

**Why this priority**: Flujos complementarios necesarios para completar la experiencia de autenticación. Son enlaces de navegación simples.

**Independent Test**: Hacer clic en "Regístrate" y verificar navegación a `/sign-up`. Hacer clic en "¿Olvidaste tu contraseña?" y verificar navegación a `/forgot-password`.

**Acceptance Scenarios**:

1. **Given** usuario en la página de inicio de sesión, **When** hace clic en "Regístrate", **Then** es redirigido a `/sign-up`.
2. **Given** usuario en la página de inicio de sesión, **When** hace clic en "¿Olvidaste tu contraseña?", **Then** es redirigido a `/forgot-password`.

---

### User Story 4 - Protección de acceso con sesión activa (Priority: P1)

Usuario que ya tiene sesión iniciada no puede acceder a la página de inicio de sesión y es redirigido automáticamente al área principal.

**Why this priority**: Evita confusión y posibles errores al intentar iniciar sesión cuando ya hay una sesión activa.

**Independent Test**: Iniciar sesión, luego navegar manualmente a `/sign-in` y verificar que hay redirección a `/recipes`.

**Acceptance Scenarios**:

1. **Given** usuario con sesión activa, **When** intenta acceder a `/sign-in`, **Then** es redirigido automáticamente a `/recipes`.

---

### Edge Cases

- Usuario envía formulario con campos vacíos: se muestra validación HTML5 nativa (required).
- Usuario ingresa email con formato inválido: validación HTML5 nativa (type="email").
- Usuario hace clic múltiple en el botón de envío: el botón se deshabilita durante el proceso para evitar envíos duplicados.
- Usuario cierra el popup de Google OAuth sin completar: el botón se re-habilita y puede reintentar.
- Usuario con cuenta no verificada solicita reenvío de verificación: se muestra feedback de éxito o error del reenvío.
- Conexión de red interrumpida durante el inicio de sesión: se muestra mensaje de error genérico.
- Usuario intenta fuerza bruta: la capa de rate limiting del backend (ya existente) limita intentos repetidos.
- Parámetro `redirect` con URL externa o maliciosa: el sistema ignora el parámetro y redirige a `/recipes` por seguridad.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La página de inicio de sesión DEBE ser accesible únicamente para usuarios sin sesión activa.
- **FR-002**: Usuarios con sesión activa que accedan a `/sign-in` DEBEN ser redirigidos a `/recipes`.
- **FR-003**: La página DEBE usar el mismo diseño visual y esquema de colores que las páginas públicas de marketing del producto.
- **FR-004**: La página DEBE ofrecer un formulario de inicio de sesión con campos de email y contraseña.
- **FR-005**: El sistema DEBE autenticar usuarios con email y contraseña válidos y redirigirlos a la URL indicada por el parámetro `redirect` (si es una ruta interna segura del mismo origen), o a `/recipes` como destino por defecto.
- **FR-006**: El sistema DEBE validar que el parámetro `redirect` sea una ruta interna segura (mismo origen, path relativo, sin protocolos externos). Si no es válido o no se proporciona, se usará `/recipes` como destino. El mismo comportamiento aplica para inicio de sesión con Google.
- **FR-007**: El sistema DEBE mostrar un mensaje de error genérico "Credenciales inválidas." cuando el email o contraseña sean incorrectos, sin revelar si la cuenta existe o no.
- **FR-008**: El sistema DEBE mostrar un mensaje específico cuando la cuenta no ha sido verificada, con opción de reenviar el correo de verificación.
- **FR-009**: La página DEBE ofrecer inicio de sesión con Google mediante OAuth.
- **FR-010**: El inicio de sesión con Google DEBE fallar con un mensaje de error si la cuenta de Google no está vinculada a una cuenta existente en el sistema. No se DEBE crear una cuenta nueva automáticamente.
- **FR-011**: La página DEBE incluir un enlace a la página de registro (`/sign-up`).
- **FR-012**: La página DEBE incluir un enlace a la página de recuperación de contraseña (`/forgot-password`).
- **FR-013**: La página DEBE mostrar un indicador visual de carga (overlay con spinner) durante el proceso de autenticación para ambos métodos.
- **FR-014**: El botón de envío del formulario y el botón de Google DEBEN deshabilitarse durante el proceso de autenticación para prevenir envíos duplicados.
- **FR-015**: El campo de contraseña DEBE tener un toggle para mostrar/ocultar la contraseña.
- **FR-016**: La página DEBE tener la barra de navegación superior con logo de KitchCalc y toggle de tema claro/oscuro.

### Key Entities

- **User (Usuario)**: Entidad existente con atributos de email, contraseña (hash), estado de verificación de email, y vinculaciones OAuth (Google). Gestionado por el sistema de autenticación existente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuarios con credenciales correctas completan el inicio de sesión en menos de 5 segundos desde que envían el formulario.
- **SC-002**: Usuarios con Google vinculado completan el inicio de sesión en menos de 8 segundos desde que hacen clic en el botón.
- **SC-003**: 100% de los intentos con credenciales incorrectas reciben mensajes de error que no revelan si el email existe o la contraseña es incorrecta.
- **SC-004**: 100% de los intentos de Google con cuenta no vinculada reciben error sin crear cuenta nueva.
- **SC-005**: Usuarios con sesión activa nunca ven la página de inicio de sesión (son redirigidos en menos de 1 segundo).
- **SC-006**: Todos los elementos interactivos (botones, enlaces, toggle de contraseña) son accesibles por teclado.

## Clarifications

### Session 2026-05-26

- Q: ¿El post-sign-in debe redirigir siempre a `/recipes` o respetar la página que el usuario intentaba acceder originalmente? → A: Respetar `?redirect=` query param si es una ruta interna segura (mismo origen, path relativo), con fallback a `/recipes`.

## Assumptions

- El sistema de autenticación Better Auth ya está configurado y funcionando con proveedor Google OAuth.
- El rate limiting de intentos de inicio de sesión ya existe a nivel de backend (implementado en `src/lib/sign-in.ts`).
- La página de recuperación de contraseña (`/forgot-password`) y la página de registro (`/sign-up`) ya existen o se implementarán en specs separadas.
- La configuración de Google OAuth en Better Auth permite distinguir entre cuentas nuevas y existentes (o se puede configurar para rechazar creación de nuevas cuentas).
- El middleware ya verifica sesiones activas y redirige apropiadamente (definido en `src/middleware.ts`).
- La página base ya existe en `src/pages/sign-in.astro` y será modificada para cumplir con los nuevos requisitos de seguridad (FR-006 y FR-009).
