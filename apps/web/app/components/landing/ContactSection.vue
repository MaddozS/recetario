<script setup lang="ts">
/**
 * Contacto. Canales directos: el correo real, sin formulario ni backend nuevo
 * (un formulario pediría un endpoint, un correo destino y antispam para un
 * tráfico que hoy no existe).
 *
 * El destino lleva tres cosas: qué escribe, con qué correo se registró y qué
 * esperaba pasar, que es lo que hace falta para responder sin ida y vuelta.
 */
const CONTACT_EMAIL = "soporte@kitchcalc.com";

const CHECKLIST = [
  "Qué estabas haciendo cuando falló",
  "El correo con el que te registraste",
  "Qué esperabas que pasara",
] as const;
</script>

<template>
  <LandingSection id="contact">
    <div
      class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
    >
      <LandingSectionHeading
        align="start"
        eyebrow="Contacto"
        title="¿Hablamos?"
        description="Soporte, dudas de facturación o una función que te falta. Escribimos personas, no un bot."
      />

      <div>
        <a
          :href="`mailto:${CONTACT_EMAIL}`"
          class="bg-card border-border hover:border-accent-300 focus-ring flex min-h-11 items-center gap-4 rounded-2xl border p-5 transition-colors"
        >
          <span
            class="bg-accent-50 text-accent-800 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          >
            <Icon name="lucide:mail" :size="20" />
          </span>
          <span class="min-w-0">
            <span class="text-foreground block font-bold">
              {{ CONTACT_EMAIL }}
            </span>
            <span class="text-muted-foreground block text-sm">
              Respondemos desde ahí, en español.
            </span>
          </span>
        </a>

        <p class="text-muted-foreground mt-6 text-sm">
          Si el mensaje es sobre un problema, estas tres cosas lo resuelven sin
          más correos:
        </p>
        <ul class="mt-3 space-y-2">
          <li
            v-for="item in CHECKLIST"
            :key="item"
            class="text-secondary-foreground flex items-start gap-2.5 text-sm"
          >
            <Icon
              name="lucide:check"
              :size="16"
              class="text-accent-text mt-0.5 shrink-0"
            />
            {{ item }}
          </li>
        </ul>
      </div>
    </div>
  </LandingSection>
</template>
