<script setup lang="ts">
/**
 * Alerta de error de una mutación de recetas. `planLimit` sólo se activa cuando
 * la causa real es el plan (`PLAN_LIMIT` o el gate anticipado): los errores
 * genéricos nunca ofrecen upgrade.
 */
defineProps<{
  message: string;
  planLimit?: boolean;
}>();
</script>

<template>
  <div>
    <FeedbackAlert type="error" :message="message" />
    <a
      v-if="planLimit"
      href="/pricing"
      class="text-danger -mt-2 inline-block font-bold underline"
    >
      Actualizar plan
    </a>
  </div>
</template>
