<script setup lang="ts">
import { ref } from "vue";

withDefaults(
  defineProps<{
    id: string;
    label: string;
    placeholder?: string;
    autocomplete?: string;
    required?: boolean;
    minlength?: number;
    showRequired?: boolean;
    disabled?: boolean;
  }>(),
  {
    placeholder: "",
    autocomplete: "off",
    required: false,
    showRequired: true,
    disabled: false,
  },
);

const model = defineModel<string>();

// Reemplaza `password-toggle.ts` y sus listeners `astro:*`.
const visible = ref(false);
</script>

<template>
  <div>
    <label
      :for="id"
      class="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wider uppercase"
    >
      {{ label
      }}<span v-if="required && showRequired" class="text-danger"> *</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        v-model="model"
        :type="visible ? 'text' : 'password'"
        :required="required"
        :minlength="minlength"
        :disabled="disabled"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        class="border-border bg-background text-foreground placeholder:text-subtle-foreground focus:border-accent-300 focus:ring-accent-500/20 w-full rounded-xl border px-4 py-3 pr-11 text-sm transition outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        :disabled="disabled"
        class="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 flex -translate-y-1/2 cursor-pointer items-center disabled:pointer-events-none disabled:opacity-50"
        :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        tabindex="-1"
        @click="visible = !visible"
      >
        <Icon v-if="visible" name="lucide:eye-off" :size="18" />
        <Icon v-else name="lucide:eye" :size="18" />
      </button>
    </div>
  </div>
</template>
