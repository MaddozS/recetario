/**
 * Soft-navigation controller — intercepts in-app GET clicks, immediately
 * replaces content with skeleton, updates the URL, fetches the target page,
 * and swaps the response content. No View Transitions, no flashes.
 *
 * Rate-limit protection: prefetch is throttled (max 1 per 2s) and initial
 * warm is staggered to avoid "too many requests" during fast section switches.
 */
let navId = 0;
let currentNavId = 0;
let progressBarEl: HTMLElement | null = null;

const prefetched = new Set<string>();

const CONTENT_SLOT_SELECTOR = "#main-content > .max-w-7xl";

const SECTION_PAGES: Record<string, string> = {
  recipes: "/recipes",
  ingredients: "/ingredients",
  settings: "/settings",
  production: "/produccion",
};

const SKELETON_HTML = `
  <div class="softnav-skeleton-content animate-pulse" style="max-width:80rem;margin:0 auto;padding:2rem">
    <div class="bg-muted rounded-2xl mb-6" style="height:120px"></div>
    <div class="space-y-4">
      <div class="bg-muted rounded-xl" style="height:60px;width:40%"></div>
      <div class="bg-muted rounded-xl" style="height:48px"></div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        <div class="bg-muted rounded-2xl" style="height:140px"></div>
        <div class="bg-muted rounded-2xl" style="height:140px"></div>
        <div class="bg-muted rounded-2xl" style="height:140px"></div>
      </div>
    </div>
  </div>`;

function getSectionFromHref(href: string): string | null {
  for (const [section, path] of Object.entries(SECTION_PAGES)) {
    if (href.startsWith(path)) return section;
  }
  return null;
}

function getBasePath(href: string): string {
  try { return new URL(href, location.origin).pathname; } catch { return ""; }
}

function setSidebarPending(section: string | null) {
  document.querySelectorAll(".sidebar-link.pending-active").forEach((el) => {
    el.classList.remove("pending-active", "opacity-70", "bg-accent-600", "text-white");
    el.classList.add("text-muted-foreground");
  });
  if (!section) return;

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    const href = link.getAttribute("href");
    const linkSection = href ? getSectionFromHref(href) : null;
    if (linkSection === section) {
      link.classList.add("bg-accent-600", "text-white", "opacity-70", "pending-active");
      link.classList.remove("text-muted-foreground");
    }
  });
}

function isInAppLink(el: HTMLAnchorElement): boolean {
  if (!el.href) return false;
  try {
    const url = new URL(el.href, location.origin);
    if (url.origin !== location.origin) return false;
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.pathname === location.pathname && url.hash && url.hash !== location.hash) return true;
    if (url.pathname === location.pathname && !url.hash) return false;
    if (url.pathname.startsWith("/api/")) return false;
    if (url.pathname.startsWith("/sign-in") || url.pathname.startsWith("/sign-up") || url.pathname.startsWith("/pricing") || url.pathname.startsWith("/forgot-password")) return false;
    if (url.pathname === "/") return false;
    return true;
  } catch { return false; }
}

function createProgressBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.id = "softnav-progress";
  bar.setAttribute("aria-label", "Cargando página");
  bar.setAttribute("role", "progressbar");
  bar.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:3px;z-index:9998;pointer-events:none;display:none";
  const inner = document.createElement("div");
  inner.className = "softnav-progress-inner";
  inner.style.cssText =
    "height:100%;background:var(--color-accent-600,#4f46e5);width:0";
  bar.appendChild(inner);
  return bar;
}

function showProgressBar() {
  if (!progressBarEl) {
    progressBarEl = createProgressBar();
    document.body.appendChild(progressBarEl);
  }
  progressBarEl.style.display = "block";
  const inner = progressBarEl.querySelector(".softnav-progress-inner") as HTMLElement | null;
  if (inner) {
    inner.style.transition = "none";
    inner.style.width = "0";
    void inner.offsetWidth;
    inner.style.transition = "width 8s cubic-bezier(0.1, 0.05, 0.2, 0.99)";
    inner.style.width = "85%";
  }
}

function hideProgressBar() {
  if (!progressBarEl) return;
  const inner = progressBarEl.querySelector(".softnav-progress-inner") as HTMLElement | null;
  if (inner) {
    inner.style.transition = "width 0.3s ease";
    inner.style.width = "100%";
  }
  setTimeout(() => {
    if (currentNavId === 0) {
      progressBarEl!.style.display = "none";
      if (inner) inner.style.width = "0";
    }
  }, 250);
}

function showErrorToast(message: string) {
  document.querySelectorAll(".snc-error-toast").forEach((el) => el.remove());
  const toast = document.createElement("div");
  toast.className = "snc-error-toast";
  toast.setAttribute("role", "alert");
  toast.style.cssText =
    "position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);z-index:10000;" +
    "background:var(--color-danger-bg,#fef2f2);color:var(--color-danger,#dc2626);" +
    "border:1px solid var(--color-danger-border,#fecaca);" +
    "border-radius:1rem;padding:0.75rem 1.5rem;font-size:0.875rem;font-weight:600;" +
    "box-shadow:0 4px 16px rgba(0,0,0,0.1);max-width:90vw;text-align:center";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

function extractContent(responseText: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(responseText, "text/html");
  const slot = doc.querySelector(CONTENT_SLOT_SELECTOR);
  return slot ? slot.innerHTML : null;
}

function extractScripts(responseText: string): string[] {
  const scripts: string[] = [];
  const regex = /<script(?:\s[^>]*?)?>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(responseText)) !== null) {
    // Only extract inline scripts (not is:inline blocks from Astro)
    const attrs = match[0].match(/^<script([^>]*)>/);
    const attrStr = attrs ? attrs[1] : "";
    // Skip hoisted/module scripts — those already loaded
    if (attrStr.includes('type="module"')) continue;
    if (attrStr.includes("src=")) continue;
    if (match[1].trim()) {
      scripts.push(match[1].trim());
    }
  }
  return scripts;
}

function executeScripts(scripts: string[]) {
  for (const code of scripts) {
    try {
      const fn = new Function(code);
      fn();
    } catch {
      // Script execution failures shouldn't break navigation
    }
  }
}

function extractTitle(responseText: string): string | null {
  const match = responseText.match(/<title>([^<]*)<\/title>/);
  return match ? match[1] : null;
}

async function performSoftNavigation(href: string, id: number) {
  try {
    const resp = await fetch(href, {
      headers: { "X-Soft-Nav": "1" },
    });

    // Handle session expiry — API redirects to sign-in
    if (resp.redirected) {
      const redirectUrl = new URL(resp.url);
      if (redirectUrl.pathname.startsWith("/sign-in")) {
        const signIn = new URL("/sign-in", location.origin);
        signIn.searchParams.set("reason", "session-expired");
        location.assign(signIn.toString());
        return;
      }
    }

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const html = await resp.text();

    if (id !== currentNavId) return;

    const scripts = extractScripts(html);
    const newContent = extractContent(html);
    const slot = document.querySelector(CONTENT_SLOT_SELECTOR);

    if (newContent && slot) {
      slot.innerHTML = newContent;
    } else {
      location.assign(href);
      return;
    }

    const newTitle = extractTitle(html);
    if (newTitle) document.title = newTitle;

    // Clean up pending state
    setSidebarPending(null);
    hideProgressBar();
    currentNavId = 0;

    // Re-run any inline scripts from the new page
    executeScripts(scripts);

    // Re-trigger lifecycle so setup functions (sidebar, prefetch, etc.) re-bind
    window.dispatchEvent(new Event("astro:page-load"));
    setupPrefetchPolicy(); // re-warm after swap
  } catch {
    if (id !== currentNavId) return;
    setSidebarPending(null);
    hideProgressBar();
    currentNavId = 0;
    showErrorToast("Error al cargar la página. Intenta de nuevo.");
  }
}

// ── Prefetch (throttled + staggered warm) ─────────────────────────────

function prefetchLink(url: string) {
  const base = getBasePath(url);
  if (!base || prefetched.has(base)) return;
  prefetched.add(base);

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "document";
  link.href = base;
  document.head.appendChild(link);
}

let lastPrefetchTime = 0;

function throttledPrefetch(url: string) {
  const now = Date.now();
  if (now - lastPrefetchTime < 2000) return;
  lastPrefetchTime = now;
  prefetchLink(url);
}

function setupPrefetchPolicy() {
  if (document.documentElement.dataset.sncPrefetchBound === "1") return;
  document.documentElement.dataset.sncPrefetchBound = "1";

  // Stagger warm: one section every 2.5s to avoid rate-limit burst
  const sections = Object.values(SECTION_PAGES);
  sections.forEach((path, i) => {
    setTimeout(() => prefetchLink(path), 500 + i * 2500);
  });

  document.addEventListener("mouseover", (e) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!isInAppLink(anchor)) return;
    throttledPrefetch(anchor.href);
  });

  document.addEventListener("focusin", (e) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!isInAppLink(anchor)) return;
    throttledPrefetch(anchor.href);
  });
}

// ── Public API ────────────────────────────────────────────────────────

export function redirectSessionExpired(): void {
  const url = new URL("/sign-in", location.origin);
  url.searchParams.set("reason", "session-expired");
  location.assign(url.toString());
}

export function setupSoftNavigationController(): void {
  if (document.documentElement.dataset.sncBound === "1") return;
  document.documentElement.dataset.sncBound = "1";

  // Use capture phase to beat ClientRouter
  document.addEventListener("click", (e) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (!isInAppLink(anchor)) return;
    if (e.metaKey || e.ctrlKey) return;
    if (anchor.hasAttribute("data-no-pending")) return;
    if (anchor.hasAttribute("data-astro-reload")) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const href = anchor.href;
    const section = getSectionFromHref(href);
    const id = ++navId;
    currentNavId = id;

    showProgressBar();
    setSidebarPending(section);

    const slot = document.querySelector(CONTENT_SLOT_SELECTOR);
    if (slot) slot.innerHTML = SKELETON_HTML;

    history.pushState({ sncNav: true }, "", href);
    performSoftNavigation(href, id);
  }, { capture: true });

  // Handle back/forward
  window.addEventListener("popstate", () => {
    const id = ++navId;
    currentNavId = id;
    showProgressBar();
    const slot = document.querySelector(CONTENT_SLOT_SELECTOR);
    if (slot) slot.innerHTML = SKELETON_HTML;
    performSoftNavigation(location.href, id);
  });

  // After content swap
  window.addEventListener("astro:page-load", () => {
    setupPrefetchPolicy();
  });

  // Safety timeout
  let safetyTimer: ReturnType<typeof setTimeout> | null = null;
  document.addEventListener("click", () => {
    if (safetyTimer) clearTimeout(safetyTimer);
    safetyTimer = setTimeout(() => {
      if (currentNavId > 0) {
        setSidebarPending(null);
        hideProgressBar();
        currentNavId = 0;
        showErrorToast("Error al cargar la página. Intenta de nuevo.");
      }
    }, 20000);
  });

  setupPrefetchPolicy();
}
