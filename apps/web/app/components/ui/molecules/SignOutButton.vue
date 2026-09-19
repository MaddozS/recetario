<script setup lang="ts">
/**
 * Cierre de sesión con pending visible. Usa el mismo cliente tipado que el
 * resto de mutaciones (`/api/auth/sign-out` es same-origin y el relay preserva
 * `Origin`/cookies), así que no hace falta el cliente de Better Auth en el
 * bundle.
 */
const api = useApi();
const { expire } = useAuth();
const overlay = useState<string | null>("loading-overlay", () => null);
const pending = ref(false);

async function signOut(): Promise<void> {
  if (pending.value) return;

  pending.value = true;
  overlay.value = "Cerrando sesión…";
  try {
    await api("/api/auth/sign-out", { method: "POST" });
    // La sesión ya no existe: descartar el estado evita que una navegación
    // posterior pase el middleware con datos obsoletos.
    expire();
    await navigateTo("/sign-in", { replace: true });
  } catch (error) {
    console.error("Sign-out failed:", error);
    window.alert("No se pudo cerrar sesión. Inténtalo de nuevo.");
  } finally {
    overlay.value = null;
    pending.value = false;
  }
}
</script>

<template>
  <Button
    id="sign-out-button"
    variant="secondary"
    icon="log-out"
    :loading="pending"
    aria-label="Cerrar sesión"
    @click="signOut"
  >
    <span class="hidden sm:inline">
      {{ pending ? "Cerrando..." : "Cerrar sesión" }}
    </span>
  </Button>
</template>
