# Feature Specification: Password Reset Flow

**Feature Branch**: `[006-password-reset-flow]`

**Created**: Thu May 28 2026

**Status**: Draft

**Input**: User description: "Restauración de contraseña - El usuario podrá desde inicio de sesión pedir un cambio de contraseña si es que la olvidó. Estará situada hasta el final del inicio de sesión (después del botón de iniciar sesión, pero no después de la parte de sesiones usando redes sociales). La forma en la que podrá cambiar la contraseña será mediante correo, en el cual se le dará un link que podrá hacer click y lo enviará a la sección de nueva contraseña, en la que pondrá su nueva contraseña con los datos que debe llevar. Esa sección usará las mismas validaciones que se tiene al crear una cuenta, y pedirá confirmación de contraseña. Al momento de hacer click a Olvidé mi contraseña, el usuario deberá ingresar su correo para poder enviar el correo de cambio de contraseña. Al momento de hacer el cambio, se le mostrará una pantalla éxito y se le mostrará la opción de regresar al inicio de sesión, donde el usuario podrá iniciar sesión con su nueva contraseña. El link deberá tener una vigencia de 10 minutos, la cual se deberá mostrar un contador en la vista de cambio de contraseña."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Request Password Reset (Priority: P1)

El usuario que ha olvidado su contraseña puede solicitar un enlace de recuperación desde la página de inicio de sesión. El sistema le solicita su correo electrónico y envía un enlace de recuperación válido por 10 minutos.

**Why this priority**: Habilita a usuarios bloqueados a recuperar acceso a sus cuentas - función crítica de recuperación.

**Independent Test**: Can be fully tested by submitting a valid email address and verifying receipt of reset email with valid link.

**Acceptance Scenarios**:

1. **Given** el usuario está en la página de inicio de sesión, **When** hace clic en "Olvidé mi contraseña", **Then** se muestra un formulario para ingresar correo electrónico.
2. **Given** el usuario ha solicitado recuperación de contraseña, **When** ingresa un correo válido registrado en el sistema, **Then** recibe un correo con enlace de recuperación y ve mensaje de confirmación en pantalla.
3. **Given** el usuario ha solicitado recuperación de contraseña, **When** ingresa un correo no registrado, **Then** ve mensaje de error indicando que el correo no existe.
4. **Given** el usuario está en el formulario de solicitud de correo, **When** intenta continuar sin ingresar correo, **Then** ve mensaje de validación requerido.

---

### User Story 2 - Reset Password with Link (Priority: P1)

El usuario recibe el enlace de recuperación por correo y puede establecer una nueva contraseña. El sistema valida que la nueva contraseña cumpla con los requisitos de seguridad (misma validación que creación de cuenta) y requiere confirmación.

**Why this priority**: Permite al usuario recuperar acceso efectivamente - objetivo central del feature.

**Independent Test**: Can be fully tested by clicking valid reset link and completing password change flow.

**Acceptance Scenarios**:

1. **Given** el usuario ha recibido enlace de recuperación válido, **When** abre el enlace, **Then** ve la página de nueva contraseña con contador de tiempo restante.
2. **Given** el usuario está en la página de nueva contraseña, **When** ingresa una contraseña que no cumple los requisitos (muy corta, sin mayúsculas, etc.), **Then** ve mensajes de error específicos para cada requisito no cumplirdo.
3. **Given** el usuario está en la página de nueva contraseña, **When** ingresa contraseñas que no coinciden, **Then** ve error indicando que las contraseñas no coinciden.
4. **Given** el usuario ha completado correctamente la nueva contraseña y confirmación, **When** hace clic en guardar, **Then** ve pantalla de éxito con opción de regresar al inicio de sesión.
5. **Given** el usuario hizo clic en regresar al inicio de sesión, **When** intenta iniciar sesión con la nueva contraseña, **Then** el inicio de sesión es exitoso.

---

### User Story 3 - Expired Link Handling (Priority: P2)

El enlace de recuperación expira después de 10 minutos. El sistema informa al usuario cuando el enlace ha expirado y le dirige a solicitar uno nuevo.

**Why this priority**: Asegura seguridad del proceso y maneja scenario de enlace obsoleto limpiamente.

**Independent Test**: Can be fully tested by using expired link and verifying proper error handling and redirect.

**Acceptance Scenarios**:

1. **Given** el usuario intenta usar un enlace de recuperación expirado, **When** abre el enlace, **Then** ve mensaje de error indicando que el enlace ha expirado y opción de solicitar uno nuevo.
2. **Given** el enlace ha expirado, **When** el usuario hace clic en solicitar nuevo enlace, **Then** es redirigido al formulario de solicitud de correo con su correo prellenado.

---

### User Story 4 - Timer Display (Priority: P2)

El usuario puede ver el tiempo restante antes de que el enlace de recuperación expire, facilitándole completar el proceso a tiempo.

**Why this priority**: Mejora UX al dar transparencia sobre el tiempo disponible y reducir ansiedad del usuario.

**Independent Test**: Can be fully tested by observing countdown timer on reset password page.

**Acceptance Scenarios**:

1. **Given** el usuario está en la página de nueva contraseña con enlace válido, **When** visualiza la página, **Then** ve un contador mostrando el tiempo restante en minutos y segundos (ej: "09:45").
2. **Given** el contador está corriendo, **When** pasan 60 segundos, **Then** el contador decrementa correctamente mostrando el tiempo restante actualizado.

---

### Edge Cases

- El usuario solicita recuperación multiple veces en poco tiempo: el sistema debe generar nuevo enlace e invalidar anteriores.
- El usuario solicita recuperación para un correo que no existe: mostrar error genérico por seguridad (no revelar si el correo existe o no).
- El usuario cambia de opinión y cierra el navegador durante el proceso de nueva contraseña: al regresar al enlace, sigue siendo válido si no ha expirado.
- El usuario tiene problemas de conectividad y el correo llega con delay: el usuario puede contactar soporte si el enlace parece expirado al llegar.
- El usuario intenta acceder directamente a la página de nueva contraseña sin tener token: redirigir a página de error o solicitud de correo.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Sistema DEBE mostrar enlace "Olvidé mi contraseña" en página de inicio de sesión, posicionado después del botón "Iniciar sesión" pero antes de las opciones de inicio con redes sociales.
- **FR-002**: Sistema DEBE mostrar formulario de solicitud de correo electrónico al hacer clic en "Olvidé mi contraseña".
- **FR-003**: Sistema DEBE validar que el campo de correo no esté vacío y tenga formato válido antes de procesar solicitud.
- **FR-004**: Sistema DEBE enviar correo electrónico con enlace de recuperación al correo ingresado si existe en el sistema.
- **FR-005**: Sistema DEBE mostrar mensaje de confirmación después de enviar el correo de recuperación (independiente de si el correo existe o no por seguridad).
- **FR-006**: Sistema DEBE generar token único de recuperación con vigencia de exactamente 10 minutos.
- **FR-007**: Sistema DEBE almacenar el token de recuperación asociándolo al usuario y marcando fecha de expiración.
- **FR-008**: Sistema DEBE invalidar tokens de recuperación anteriores del mismo usuario al generar uno nuevo.
- **FR-009**: Sistema DEBE mostrar la página de nueva contraseña únicamente cuando el token es válido y no ha expirado.
- **FR-010**: Sistema DEBE mostrar contador de tiempo restante (en formato MM:SS) visible en la página de nueva contraseña.
- **FR-011**: Sistema DEBE aplicar las mismas validaciones de contraseña que en la creación de cuenta (requisitos de complejidad).
- **FR-012**: Sistema DEBE requerir que el usuario ingrese la nueva contraseña dos veces para confirmarla.
- **FR-013**: Sistema DEBE validar que ambas contraseñas ingresadas sean idénticas antes de guardar.
- **FR-014**: Sistema DEBE actualizar la contraseña del usuario en la base de datos al confirmar el cambio exitosamente.
- **FR-015**: Sistema DEBE invalidar el token de recuperación después de usarlo exitosamente.
- **FR-016**: Sistema DEBE mostrar pantalla de éxito después de cambiar la contraseña exitosamente, con opción de regresar al inicio de sesión.
- **FR-017**: Sistema DEBE redirigir al usuario al inicio de sesión al hacer clic en la opción de regresar.
- **FR-018**: Sistema DEBE mostrar mensaje de error claro cuando el enlace ha expirado, con opción de solicitar uno nuevo.

### Key Entities _(include if feature involves data)_

- **PasswordResetToken**: Representa el token de recuperación de contraseña. Atributos: token (único), userId (relación a User), createdAt, expiresAt, used (boolean).
- **User**: Entidad existente que representa al usuario. El feature agrega capacidad de generar y validar tokens de recuperación.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Usuarios pueden completar el flujo de recuperación de contraseña en menos de 3 minutos desde solicitud hasta inicio de sesión exitoso.
- **SC-002**: Sistema procesa solicitudes de recuperación de contraseña en menos de 5 segundos (envío de correo).
- **SC-003**: 95% de usuarios que reciben enlace válido completan el proceso de recuperación exitosamente.
- **SC-004**: Mensajes de error son claros y accionables, reduciendo llamadas de soporte por problemas de recuperación de contraseña en 80%.
- **SC-005**: Contador de tiempo es visible y actualizado cada segundo durante el proceso de cambio de contraseña.

## Assumptions

- El sistema de correo electrónico transactional está configurado y funcional para enviar enlaces de recuperación.
- Los requisitos de validación de contraseña para creación de cuenta están definidos y documentados en el codebase existente.
- La base de datos tiene capacidad de almacenar tokens de recuperación con sus fechas de expiración.
- El frontend puede mostrar un contador que se actualice cada segundo sin causar degradación de rendimiento.
- El diseño visual de la página de inicio de sesión permite acomodar el enlace "Olvidé mi contraseña" en la posición especificada sin romper el layout existente.