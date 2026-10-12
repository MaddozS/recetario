<script setup lang="ts">
definePageMeta({ layout: "public" });

usePageSeo("/terms");
</script>

<template>
  <LandingSection width="narrow">
    <LandingSectionHeading
      level="h1"
      align="start"
      eyebrow="Legal"
      title="Términos del servicio"
    />
    <p class="text-muted-foreground mt-3 text-sm">
      Última actualización: mayo 2026
    </p>

    <div class="text-secondary-foreground mt-10 space-y-8 leading-relaxed">
      <section>
        <h2 class="text-foreground text-xl font-bold">1. Servicio</h2>
        <p class="mt-2">
          KitchCalc es una herramienta web para calcular costos, márgenes y
          precios de recetas. El servicio se brinda "tal cual" y nos esforzamos
          por mantener su disponibilidad, pero no podemos garantizar un
          funcionamiento ininterrumpido.
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">2. Cuentas</h2>
        <p class="mt-2">
          Eres responsable de mantener la confidencialidad de tu contraseña y de
          toda actividad que ocurra bajo tu cuenta. Debes notificarnos
          inmediatamente sobre cualquier uso no autorizado.
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">3. Planes y pagos</h2>
        <p class="mt-2">
          Ofrecemos planes gratuitos y de pago. Las suscripciones se renuevan
          automáticamente al final del período contratado. Puedes cancelar en
          cualquier momento desde la sección de facturación en la aplicación. Al
          cancelar, el acceso a las funciones del plan pagado se mantiene hasta
          el final del período facturado.
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">4. Límites de uso</h2>
        <p class="mt-2">
          Cada plan tiene límites específicos de recetas e ingredientes. Si
          alcanzas el límite de tu plan, deberás actualizar a un plan superior
          para continuar agregando contenido. No realizamos reembolsos parciales
          por períodos no utilizados.
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">
          5. Propiedad de los datos
        </h2>
        <p class="mt-2">
          Todos los datos que ingreses en KitchCalc (recetas, ingredientes,
          costos) te pertenecen. No utilizamos tus datos para entrenar modelos
          de inteligencia artificial ni los compartimos con terceros.
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">
          6. Cancelación y eliminación
        </h2>
        <p class="mt-2">
          Puedes eliminar tu cuenta en cualquier momento. Al hacerlo, todos tus
          datos serán eliminados de nuestros servidores en un plazo de 30 días.
        </p>
      </section>

      <section>
        <h2 class="text-foreground text-xl font-bold">7. Modificaciones</h2>
        <p class="mt-2">
          Podemos modificar estos términos en cualquier momento. Los cambios
          serán notificados a través de la aplicación. El uso continuado del
          servicio después de los cambios constituye la aceptación de los nuevos
          términos.
        </p>
      </section>
    </div>

    <p class="text-muted-foreground mt-10 border-t border-border pt-6 text-sm">
      ¿Dudas sobre estos términos?
      <NuxtLink to="/#contact" class="text-accent-text focus-ring rounded font-bold">
        Escríbenos
      </NuxtLink>
      .
    </p>
  </LandingSection>
</template>
