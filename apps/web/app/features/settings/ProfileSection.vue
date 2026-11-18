<script setup lang="ts">
import { computed } from 'vue';
import AccountNameForm from './AccountNameForm.vue';
import AccountPasswordForm from './AccountPasswordForm.vue';
import { accountNameFormFrom } from './account-form';
import { useAccountSettings } from './useAccountSettings';

/**
 * Pestaña Perfil: card de identidad + formularios de nombre y contraseña.
 * El formulario de cambio de email **no** se porta: el baseline sólo tenía JS
 * muerto sin markup (mandato del roadmap).
 */
const { user } = useAuth();
const { mutation, updateName, changePassword } = useAccountSettings();

const nameForm = computed(() =>
  accountNameFormFrom({
    firstName: user.value?.firstName ?? null,
    lastName: user.value?.lastName ?? null,
  })
);

const displayName = computed(() => {
  const { firstName, lastName } = nameForm.value;
  return `${firstName} ${lastName}`.trim() || user.value?.name || 'Usuario';
});

const initial = computed(() =>
  (nameForm.value.firstName || displayName.value).charAt(0).toUpperCase()
);
</script>

<template>
  <div v-if="user" data-tab-content="profile" class="space-y-6">
    <Card padding="lg">
      <div class="flex items-center gap-4">
        <div
          class="bg-accent-solid shadow-accent-100 text-text-on-accent flex h-16 w-16 flex-none items-center justify-center rounded-2xl text-xl font-bold shadow-md"
        >
          <img
            v-if="user.image"
            :src="user.image"
            :alt="displayName"
            referrerpolicy="no-referrer"
            class="h-full w-full rounded-2xl object-cover"
          />
          <span v-else id="profile-user-initial">{{ initial }}</span>
        </div>
        <div class="min-w-0">
          <p class="text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase">
            {{ user.hasPasswordAuth ? 'Cuenta de email' : 'Sesión de Google' }}
          </p>
          <h2 id="profile-user-name" class="text-foreground mt-1 truncate text-xl font-bold">
            {{ displayName }}
          </h2>
          <p
            v-if="user.email"
            id="profile-user-email"
            class="text-muted-foreground mt-0.5 truncate text-sm"
          >
            {{ user.email }}
          </p>
        </div>
      </div>
    </Card>

    <AccountNameForm :initial="nameForm" :submit="updateName" :submitting="mutation === 'name'" />

    <AccountPasswordForm
      v-if="user.hasPasswordAuth"
      :submit="changePassword"
      :submitting="mutation === 'password'"
    />
  </div>
</template>
