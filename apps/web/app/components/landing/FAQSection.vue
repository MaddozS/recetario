<script setup lang="ts">
/**
 * Preguntas frecuentes (FAQ).
 * Resuelve las dudas y objeciones de compra más comunes de forma accesible
 * e incluye el canal directo de contacto al final.
 */
const FAQS = [
  {
    q: '¿Necesito tarjeta de crédito para registrarme?',
    a: 'No. Puedes crear tu cuenta gratis en 1 minuto usando tu correo o tu cuenta de Google. No te pediremos tarjeta y podrás costear hasta 10 recetas y 30 ingredientes de forma ilimitada.',
  },
  {
    q: '¿Qué ocurre cuando llego al límite de 10 recetas del plan gratis?',
    a: 'Tus recetas guardadas nunca se bloquean ni se borran. Cuando tu catálogo crezca, puedes actualizar a Basic para tener hasta 75 recetas e ingredientes ilimitados. El costo del plan se paga solo evitando un solo error de precio.',
  },
  {
    q: '¿Cómo calculo gastos como luz, gas o empaque?',
    a: 'En cada receta puedes agregar gastos fijos como porcentaje del costo directo (ej. 10% de servicios) o como un monto fijo por lote. KitchCalc los integra automáticamente en el costo total para que tu margen sea 100% real.',
  },
  {
    q: '¿Funciona en mi teléfono celular o tablet?',
    a: 'Sí. KitchCalc está diseñado para adaptarse perfectamente a la pantalla de tu smartphone, tablet o computadora, para que puedas consultar o cargar ingredientes directamente desde la cocina o mientras haces compras.',
  },
  {
    q: '¿Mis recetas y fórmulas están seguras y privadas?',
    a: 'Totalmente. Tu información está aislada y protegida bajo tu propia cuenta. Nadie fuera de tu sesión puede ver tus ingredientes, costos, proveedores ni fórmulas.',
  },
  {
    q: '¿Puedo cancelar o cambiar mi suscripción cuando quiera?',
    a: 'Sí, sin contratos ni plazos forzosos. Puedes cambiar de plan o cancelar tu suscripción con un solo clic directamente desde tu panel de Ajustes en cualquier momento.',
  },
] as const;

const CONTACT_EMAIL = 'soporte@kitchcalc.com';
</script>

<template>
  <LandingSection id="faq" tone="muted" bordered>
    <div id="preguntas" class="scroll-mt-16">
      <LandingSectionHeading
        eyebrow="Preguntas frecuentes"
        title="Resolvemos tus dudas"
        description="Todo lo que necesitas saber antes de empezar a costear tus recetas con KitchCalc."
      />

      <div class="mx-auto mt-12 max-w-3xl space-y-4">
        <details
          v-for="faq in FAQS"
          :key="faq.q"
          class="group bg-card border-border open:border-accent-300 rounded-2xl border p-5 shadow-xs transition-colors"
        >
          <summary
            class="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold select-none [&::-webkit-details-marker]:hidden"
          >
            <span>{{ faq.q }}</span>
            <span
              class="text-accent-text bg-accent-50 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-open:rotate-180"
            >
              <Icon name="lucide:chevron-down" :size="16" />
            </span>
          </summary>
          <p
            class="text-secondary-foreground border-border/60 mt-3.5 border-t pt-3 text-sm leading-relaxed"
          >
            {{ faq.a }}
          </p>
        </details>
      </div>

      <div
        id="contact"
        class="bg-card border-border mx-auto mt-12 max-w-xl rounded-2xl border p-6 text-center shadow-xs"
      >
        <h3 class="text-foreground text-base font-bold">¿Tienes alguna otra pregunta?</h3>
        <p class="text-secondary-foreground mt-1 text-sm">
          Escríbenos y te respondemos directamente en español.
        </p>
        <a
          :href="`mailto:${CONTACT_EMAIL}`"
          class="focus-ring text-accent-text mt-3 inline-flex items-center gap-2 rounded-lg text-sm font-bold hover:underline"
        >
          <Icon name="lucide:mail" :size="16" />
          {{ CONTACT_EMAIL }}
        </a>
      </div>
    </div>
  </LandingSection>
</template>
