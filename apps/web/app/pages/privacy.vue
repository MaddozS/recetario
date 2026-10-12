<script setup lang="ts">
definePageMeta({ layout: "public" });

usePageSeo("/privacy");
</script>

<template>
  <LandingSection width="narrow">
    <LandingSectionHeading
      level="h1"
      align="start"
      eyebrow="Legal"
      title="Política de privacidad"
    />
    <p class="text-muted-foreground mt-3 text-sm">
      Última actualización: mayo 2026
    </p>

    <div class="text-secondary-foreground mt-10 space-y-8 leading-relaxed">
      <section>
        <h2 class="text-foreground text-xl font-bold">
          1. Datos que recopilamos
        </h2>
        <p class="mt-2">
          KitchCalc recopila únicamente los datos necesarios para el
          funcionamiento del servicio:
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li>Nombre y correo electrónico (al registrarse)</li>
          <li>Recetas, ingredientes y datos de costeo que el usuario ingresa</li>
          <li>
            Preferencias de tema visual (modo oscuro/claro y color de acento)
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">2. Autenticación</h2>
        <p class="mt-2">
          Ofrecemos dos métodos de autenticación: correo electrónico y
          contraseña, e inicio de sesión con Google. Al usar Google OAuth,
          recibimos únicamente tu nombre, correo e imagen de perfil. No
          almacenamos contraseñas de Google ni accedemos a otros datos de tu
          cuenta de Google.
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">3. Pagos</h2>
        <p class="mt-2">
          Los pagos se procesan exclusivamente a través de Stripe. KitchCalc no
          almacena ni tiene acceso a los datos de tu tarjeta de crédito. Stripe
          maneja toda la información de pago conforme a sus estándares de
          seguridad (PCI-DSS).
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">4. Cookies</h2>
        <p class="mt-2">
          Utilizamos cookies únicamente para mantener tu sesión iniciada y
          recordar tus preferencias de tema visual. No usamos cookies de
          rastreo publicitario ni de terceros no esenciales.
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">
          5. Almacenamiento y seguridad
        </h2>
        <p class="mt-2">
          Tus datos se almacenan en PostgreSQL con cifrado en reposo. Las
          conexiones se realizan exclusivamente por HTTPS. Implementamos
          aislamiento multi-tenencia: cada usuario solo accede a sus propios
          datos.
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">6. Contacto</h2>
        <p class="mt-2">
          Para consultas sobre privacidad o eliminación de datos, escríbenos a
          <a
            href="mailto:soporte@kitchcalc.com"
            class="text-accent-text focus-ring rounded font-bold"
          >
            soporte@kitchcalc.com
          </a>
          .
        </p>
      </section>
    </div>
  </LandingSection>
</template>
