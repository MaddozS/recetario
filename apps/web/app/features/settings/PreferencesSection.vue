<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import {
  ACCENT_FAMILIES,
  ACCENT_LABELS,
  getAccentPreviewColor,
} from "~/utils/accent-colors";
import type { AccentFamily } from "~/utils/accent-colors";
import type { AuthPreferences } from "#shared/types/auth";
import { PREFERENCES_SAVED_MESSAGE } from "./settings-messages";

/**
 * Pestaña Preferencias: preview local + guardado explícito.
 *
 * El clic previsualiza con `useTheme` (estado compartido; `<html>` lo gobierna
 * `app.vue`), el botón sólo aparece si el borrador difiere de lo persistido y
 * `saveAppearance` escribe las cookies **desde la respuesta confirmada**. En
 * error, el preview revierte a lo persistido y se muestra el aviso.
 */

const THEME_OPTIONS = [
  { value: "system", label: "Automático", icon: "monitor" },
  { value: "light", label: "Claro", icon: "sun" },
  { value: "dark", label: "Oscuro", icon: "moon" },
] as const;

const { preferences } = useAuth();
const { setTheme, setAccent } = useTheme();
const { saving, saveAppearance } = useAppearancePersistence();

const draft = ref<AuthPreferences>({ ...preferences.value });
const feedback = ref<{ type: "success" | "error"; message: string } | null>(
  null,
);
const feedbackEl = ref<HTMLElement | null>(null);

const dirty = computed(
  () =>
    draft.value.theme !== preferences.value.theme ||
    draft.value.accentColor !== preferences.value.accentColor,
);

function selectTheme(value: string): void {
  draft.value = { ...draft.value, theme: value as AuthPreferences["theme"] };
  setTheme(value);
  feedback.value = null;
}

function selectAccent(value: AccentFamily): void {
  draft.value = { ...draft.value, accentColor: value };
  setAccent(value);
  feedback.value = null;
}

async function showFeedback(next: {
  type: "success" | "error";
  message: string;
}): Promise<void> {
  feedback.value = next;
  await nextTick();
  feedbackEl.value?.focus();
}

async function save(): Promise<void> {
  const outcome = await saveAppearance(
    { ...draft.value },
    { rollbackTo: { ...preferences.value } },
  );

  if (outcome.ok) {
    await showFeedback({ type: "success", message: PREFERENCES_SAVED_MESSAGE });
    return;
  }

  // El preview ya revirtió: el borrador vuelve a lo persistido.
  draft.value = { ...preferences.value };
  await showFeedback({ type: "error", message: outcome.message });
}
</script>

<template>
  <div data-tab-content="preferences">
    <div v-if="feedback" ref="feedbackEl" tabindex="-1" class="outline-none">
      <FeedbackAlert :type="feedback.type" :message="feedback.message" />
    </div>

    <div class="space-y-6">
      <Card padding="lg">
        <h2 class="text-foreground text-lg font-bold">Tema</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          Selecciona cómo quieres que se vea la aplicación.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <Button
            v-for="option in THEME_OPTIONS"
            :key="option.value"
            :variant="draft.theme === option.value ? 'primary' : 'secondary'"
            size="md"
            :icon="option.icon"
            :data-theme-option="option.value"
            :data-theme-active="draft.theme === option.value ? '1' : '0'"
            :aria-pressed="draft.theme === option.value ? 'true' : 'false'"
            @click="selectTheme(option.value)"
          >
            {{ option.label }}
          </Button>
        </div>
      </Card>

      <Card padding="lg">
        <h2 class="text-foreground text-lg font-bold">Color de acento</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          Personaliza el color principal de la aplicación.
        </p>
        <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            v-for="family in ACCENT_FAMILIES"
            :key="family"
            type="button"
            :data-accent-option="family"
            :data-accent-active="draft.accentColor === family ? '1' : '0'"
            :aria-pressed="draft.accentColor === family ? 'true' : 'false'"
            class="focus-visible:ring-accent-500 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            :class="
              draft.accentColor === family
                ? 'ring-accent-500 bg-accent-50 ring-2 ring-offset-1'
                : 'border-border bg-card text-muted-foreground hover:bg-background border'
            "
            @click="selectAccent(family)"
          >
            <span
              class="block h-5 w-5 flex-none rounded-full border"
              :class="
                draft.accentColor === family
                  ? 'border-accent-400'
                  : 'border-border'
              "
              :style="{ backgroundColor: getAccentPreviewColor(family) }"
            />
            <span
              :class="
                draft.accentColor === family
                  ? 'text-accent-700'
                  : 'text-muted-foreground'
              "
            >
              {{ ACCENT_LABELS[family] }}
            </span>
          </button>
        </div>
      </Card>

      <div v-if="dirty" id="save-btn-wrapper">
        <Button
          variant="primary"
          type="button"
          icon="save"
          :loading="saving"
          @click="save"
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  </div>
</template>
