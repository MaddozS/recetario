# Feature Specification: Página de Registro de Usuario

**Feature Branch**: `005-sign-up-page`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Pagina de registro de usuario. La pagina de registro de usuario se accede desde la pagina de inicio de sesión. Esta página tiene la opción de crear cuentas usando correo y contraseña. también el usuario podrá poner otros datos como el nombre y apellido. También el usuario puede crear la cuenta usando redes sociales. La página debe seguir los lineamientos de diseño establecidos para el proyecto."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Registro con email, contraseña, nombre y apellido (Priority: P1)

Un usuario nuevo accede a la página de registro desde el enlace en la página de inicio de sesión, completa el formulario con su email, contraseña, nombre, apellido, y crea su cuenta exitosamente. Al completar el registro, el sistema envía un correo de verificación y muestra una confirmación al usuario.

**Why this priority**: Es el flujo principal de adquisición de usuarios. Sin este flujo, los nuevos usuarios no pueden crear cuentas con email/contraseña y el producto no puede crecer.

**Independent Test**: Navegar a `/sign-up`, llenar nombre, apellido, email y contraseña válidos, enviar el formulario y verificar que se muestra la pantalla de "Verifica tu email" con el correo ingresado.

**Acceptance Scenarios**:

1. **Given** usuario sin sesión activa en `/sign-up`, **When** completa nombre, apellido, email válido, contraseña de al menos 6 caracteres y confirma la contraseña correctamente, **Then** se crea la cuenta, se envía correo de verificación, y se muestra la pantalla de confirmación con instrucciones de verificación.
2. **Given** usuario sin sesión activa en `/sign-up`, **When** completa el formulario pero las contraseñas no coinciden, **Then** ve un mensaje de error "Las contraseñas no coinciden." y la cuenta no se crea.
3. **Given** usuario sin sesión activa en `/sign-up`, **When** completa el formulario con un email ya registrado, **Then** ve un mensaje de error indicando que el email ya está en uso y la cuenta no se crea.
4. **Given** usuario sin sesión activa en `/sign-up`, **When** completa el formulario con contraseña menor a 6 caracteres, **Then** ve un mensaje de error indicando el requisito mínimo y la cuenta no se crea.
5. **Given** usuario sin sesión activa en `/sign-up`, **When** intenta enviar el formulario con campos obligatorios vacíos (nombre, apellido, email, o contraseña), **Then** la validación nativa del navegador bloquea el envío y muestra los campos requeridos.
6. **Given** usuario en la pantalla de verificación post-registro, **When** hace clic en "Reenviar correo", **Then** se reenvía el correo de verificación y se muestra un mensaje de confirmación.

---

### User Story 2 - Registro con Google (Priority: P2)

Un usuario nuevo accede a la página de registro y elige crear su cuenta usando su cuenta de Google. El sistema obtiene el nombre y apellido del perfil de Google, crea la cuenta vinculada, y redirige al usuario al área protegida.

**Why this priority**: Proporciona una alternativa de registro más rápida que reduce la fricción para nuevos usuarios que prefieren usar su cuenta de Google. Es una opción independiente del registro por email.

**Independent Test**: Navegar a `/sign-up`, hacer clic en "Continuar con Google" con una cuenta de Google no vinculada previamente, completar el flujo de autenticación, y verificar que se crea la cuenta y se redirige a `/recipes` con sesión iniciada.

**Acceptance Scenarios**:

1. **Given** usuario sin sesión activa en `/sign-up`, **When** hace clic en "Continuar con Google" y completa el flujo de autenticación con una cuenta de Google no vinculada, **Then** se crea la cuenta nueva con los datos del perfil de Google, se inicia sesión automáticamente y es redirigido a `/recipes`.
2. **Given** usuario sin sesión activa en `/sign-up`, **When** hace clic en "Continuar con Google" con una cuenta de Google ya vinculada a una cuenta existente, **Then** inicia sesión exitosamente y es redirigido a `/recipes`.
3. **Given** usuario sin sesión activa en `/sign-up`, **When** el flujo de autenticación de Google falla por error de red, cancelación del usuario, o configuración, **Then** ve un mensaje de error apropiado y puede reintentar.

---

### User Story 3 - Navegación desde y hacia inicio de sesión (Priority: P3)

Un usuario que ya tiene cuenta puede navegar fácilmente desde la página de registro a la página de inicio de sesión, y viceversa.

**Why this priority**: Flujo de navegación complementario necesario para la experiencia completa de autenticación. Es un enlace simple de implementar.

**Independent Test**: Hacer clic en "Inicia sesión" desde `/sign-up` y verificar navegación a `/sign-in`. Hacer clic en "Regístrate" desde `/sign-in` y verificar navegación a `/sign-up`.

**Acceptance Scenarios**:

1. **Given** usuario en la página de registro, **When** hace clic en "Inicia sesión" (o "¿Ya tienes cuenta?"), **Then** es redirigido a `/sign-in`.
2. **Given** usuario en la página de inicio de sesión, **When** hace clic en "Regístrate" (o "¿No tienes cuenta?"), **Then** es redirigido a `/sign-up`.

---

### User Story 4 - Protección de acceso con sesión activa (Priority: P1)

Un usuario que ya tiene sesión iniciada no debe poder acceder a la página de registro y debe ser redirigido automáticamente al área protegida.

**Why this priority**: Evita confusión y errores al intentar crear una cuenta cuando ya hay una sesión activa. Es una protección de integridad básica.

**Independent Test**: Iniciar sesión, luego navegar manualmente a `/sign-up` y verificar que hay redirección a `/recipes`.

**Acceptance Scenarios**:

1. **Given** usuario con sesión activa, **When** intenta acceder a `/sign-up`, **Then** es redirigido automáticamente a `/recipes`.

---

### User Story 5 - Consistencia visual con el diseño del proyecto (Priority: P2)

La página de registro debe seguir los mismos lineamientos de diseño que la página de inicio de sesión y el resto de páginas públicas, usando la paleta de colores landing y los componentes del sistema de diseño del proyecto.

**Why this priority**: La consistencia visual es crítica para la experiencia de usuario y la percepción de calidad del producto. Define el estándar visual que deben cumplir todos los elementos.

**Independent Test**: Comparar visualmente la página de registro con la página de inicio de sesión y verificar que usan el mismo layout, componentes, tokens de color, tipografía y espaciado.

**Acceptance Scenarios**:

1. **Given** cualquier usuario en `/sign-up`, **When** observa la página, **Then** ve el mismo diseño de páginas públicas con barra de navegación superior (logo KitchCalc + toggle de tema), tarjeta centrada con acento decorativo superior, ícono representativo, y estructura visual idéntica a `/sign-in`.
2. **Given** cualquier usuario en `/sign-up`, **When** interactúa con campos de formulario, **Then** todos los inputs, botones, y elementos usan los mismos estilos, colores semánticos, y comportamientos (focus, hover, estados de carga) que `/sign-in`.

---

### Edge Cases

- Usuario envía formulario con email en formato inválido: validación nativa del navegador bloquea el envío.
- Usuario hace clic múltiple en el botón de envío: el botón se deshabilita durante el proceso para evitar envíos duplicados y se muestra un indicador de carga.
- Usuario cierra la ventana de autenticación de Google sin completar el proceso: el botón se re-habilita y puede reintentar.
- Usuario intenta registrar un email que ya existe pero no está verificado: el sistema debe indicar que el email ya está registrado o permitir reenviar verificación.
- Usuario recarga la página después del registro exitoso pero antes de verificar email: se muestra nuevamente la pantalla de verificación (persistiendo temporalmente el email ingresado durante la sesión de navegación).
- Conexión de red interrumpida durante el registro: se muestra mensaje de error y el usuario puede reintentar.
- Usuario pega texto con espacios al inicio o final en los campos de nombre y apellido: los espacios se eliminan automáticamente antes de enviar.
- Nombre o apellido con caracteres especiales (acentos, ñ, apóstrofes): el sistema debe aceptarlos sin errores.
- Usuario intenta registro con una contraseña débil (ej. "123456"): la validación de longitud mínima (6 caracteres) es el único requisito explícito; requisitos adicionales de complejidad quedan fuera del alcance.
- Usuario navega a `/sign-up` con parámetro `?redirect=`: el parámetro se respeta para redirigir después de un registro exitoso con verificación de seguridad de misma-origen.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: La página de registro DEBE ser accesible únicamente para usuarios sin sesión activa.
- **FR-002**: Usuarios con sesión activa que accedan a `/sign-up` DEBEN ser redirigidos a `/recipes`.
- **FR-003**: La página DEBE usar el mismo diseño visual, esquema de colores, y estructura que las demás páginas públicas de marketing del producto (barra de navegación superior, tarjeta centrada, sin sidebar de aplicación).
- **FR-004**: La página DEBE mostrar la barra de navegación superior con logo de KitchCalc y toggle de tema claro/oscuro.
- **FR-005**: La página DEBE ofrecer un formulario de registro con campos de nombre, apellido, email, contraseña y confirmación de contraseña.
- **FR-006**: El sistema DEBE validar que la contraseña tenga al menos 6 caracteres.
- **FR-007**: El sistema DEBE validar que la contraseña y la confirmación de contraseña coincidan antes de enviar el registro.
- **FR-008**: El sistema DEBE recortar espacios en blanco al inicio y final de los campos de nombre y apellido antes de crear la cuenta.
- **FR-009**: El sistema DEBE crear la cuenta de usuario con los datos proporcionados (nombre, apellido, email, contraseña) y enviar un correo de verificación al email registrado.
- **FR-010**: El sistema DEBE mostrar un mensaje de error claro cuando el email ingresado ya está registrado.
- **FR-011**: El sistema DEBE mostrar una pantalla de confirmación post-registro indicando que se ha enviado un correo de verificación, con el email mostrado y opción de reenviar el correo.
- **FR-012**: La página DEBE ofrecer registro mediante cuenta de Google como alternativa al formulario de email/contraseña.
- **FR-013**: El registro con Google DEBE crear una cuenta nueva vinculada a la cuenta de Google si no existe previamente, obteniendo nombre y apellido del perfil de Google.
- **FR-014**: El registro con Google DEBE iniciar sesión automáticamente si la cuenta de Google ya está vinculada a una cuenta existente.
- **FR-015**: La página DEBE mostrar un indicador visual de carga durante el proceso de registro para ambos métodos (email y Google).
- **FR-016**: El botón de envío del formulario y el botón de Google DEBEN deshabilitarse durante el proceso de registro para prevenir envíos duplicados.
- **FR-017**: Los campos de contraseña y confirmación de contraseña DEBEN tener un toggle para mostrar/ocultar la contraseña.
- **FR-018**: La página DEBE incluir un enlace a la página de inicio de sesión (`/sign-in`) para usuarios que ya tienen cuenta.
- **FR-019**: El sistema DEBE respetar el parámetro `redirect` (si es una ruta interna segura del mismo origen) para redirigir al usuario después de un registro exitoso con Google. Para registro con email, la redirección ocurre después de la verificación.

### Key Entities _(include if feature involves data)_

- **User (Usuario)**: Entidad existente que requiere los nuevos atributos de nombre y apellido. Incluye email, contraseña (hash), estado de verificación de email, y vinculaciones con cuentas de Google. Gestionado por el sistema de autenticación existente.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Usuarios nuevos completan el registro con email y contraseña en menos de 3 minutos desde que llegan a la página.
- **SC-002**: Usuarios nuevos completan el registro con Google en menos de 15 segundos desde que hacen clic en el botón.
- **SC-003**: 100% de los registros exitosos con email reciben el correo de verificación en menos de 30 segundos.
- **SC-004**: 90% o más de los usuarios que inician el registro con email lo completan exitosamente en el primer intento.
- **SC-005**: Usuarios con sesión activa nunca ven la página de registro (son redirigidos en menos de 1 segundo).
- **SC-006**: Todos los elementos interactivos (botones, enlaces, toggles de contraseña, campos de formulario) son accesibles por teclado.
- **SC-007**: La página de registro es visualmente indistinguible en estilo y calidad de la página de inicio de sesión existente, usando los mismos elementos estructurales (tarjeta centrada, acento decorativo, ícono, tipografía y espaciado).

## Assumptions

- El sistema de autenticación Better Auth ya está configurado y funcionando con proveedor Google OAuth y verificación de email.
- La configuración `disableSignUp: true` actual en el proveedor Google se cambiará a `false` para permitir la creación de cuentas mediante Google en todas las páginas (patrón estándar en aplicaciones SaaS donde el mismo botón de Google maneja tanto registro como inicio de sesión).
- Los campos `firstName` y `lastName` serán agregados al modelo de usuario de Better Auth (el sistema ya soporta el campo `name` pero no distingue nombre/apellido).
- El perfil de Google proporciona `given_name` y `family_name` que se usarán para nombre y apellido respectivamente durante el registro con Google.
- La página de inicio de sesión (`/sign-in`) ya existe y contiene el enlace a `/sign-up`. La página de registro (`/sign-up`) ya existe como estructura base y será modificada para agregar los campos de nombre y apellido.
- La validación de contraseñas se limita a longitud mínima de 6 caracteres, sin requisitos adicionales de complejidad (mayúsculas, números, caracteres especiales).
- El rate limiting de intentos de registro ya existe o se apoya en la infraestructura de rate limiting existente del backend.
- Las páginas de términos de servicio y política de privacidad están fuera del alcance de esta especificación.
