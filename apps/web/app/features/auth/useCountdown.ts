import { computed, onBeforeUnmount, ref } from "vue";
import { formatCountdown } from "./format-countdown";

const TICK_MS = 1000;

/**
 * Countdown de un solo intervalo que avisa al expirar y se limpia al desmontar.
 *
 * Sustituye a la cadena recursiva de `setTimeout` de `reset-password`, que
 * no tenía cleanup y seguía viva tras abandonar la página.
 */
export function useCountdown(onExpire: () => void) {
  const remaining = ref(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  function stop(): void {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  }

  function start(seconds: number): void {
    stop();
    remaining.value = Math.max(0, Math.floor(seconds));

    if (remaining.value === 0) {
      onExpire();
      return;
    }

    timer = setInterval(() => {
      remaining.value -= 1;
      if (remaining.value <= 0) {
        stop();
        remaining.value = 0;
        onExpire();
      }
    }, TICK_MS);
  }

  onBeforeUnmount(stop);

  return {
    remaining,
    label: computed(() => formatCountdown(remaining.value)),
    start,
    stop,
  };
}
