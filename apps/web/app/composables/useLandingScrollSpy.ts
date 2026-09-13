import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

/**
 * Marca la sección visible del landing para resaltar el enlace del navbar.
 * Un observer por sección, con cleanup al desmontar; sustituye al scroll-spy
 * global que escribía `data-spy-active` sobre el DOM.
 */
export function useLandingScrollSpy(
  sectionIds: readonly string[],
): Ref<string | null> {
  const activeSection = ref<string | null>(null);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSection.value = entry.target.id;
          } else if (activeSection.value === entry.target.id) {
            activeSection.value = null;
          }
        }
      },
      { threshold: 0.5 },
    );

    for (const element of elements) {
      observer.observe(element);
    }
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  return activeSection;
}
