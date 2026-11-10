export type ColorSchemePreference = "light" | "dark" | "light dark";
export type ResolvedScheme = "light" | "dark";

const STORAGE_KEY = "color-scheme";

export function normalizeStoredColorScheme(
  raw: string | null | undefined,
): ColorSchemePreference {
  if (raw === "light" || raw === "dark") return raw;
  return "light dark";
}

export function resolveRenderedScheme(
  metaContent: string | null | undefined,
  systemPrefersDark: boolean,
): ResolvedScheme {
  if (metaContent === "dark") return "dark";
  if (metaContent === "light") return "light";
  return systemPrefersDark ? "dark" : "light";
}

/**
 * Implements two-state toggle over tri-state model ("light dark" | "light" | "dark"):
 * - Picks the opposite of the currently rendered scheme.
 * - If that target matches the current OS preference, removes the stored override ("light dark").
 * - Otherwise stores the literal target scheme.
 */
export function computeNextColorScheme(
  currentMetaContent: string | null | undefined,
  systemPrefersDark: boolean,
): { stored: "light" | "dark" | null; metaContent: ColorSchemePreference } {
  const rendered = resolveRenderedScheme(currentMetaContent, systemPrefersDark);
  const target: ResolvedScheme = rendered === "dark" ? "light" : "dark";
  const systemScheme: ResolvedScheme = systemPrefersDark ? "dark" : "light";

  if (target === systemScheme) {
    return { stored: null, metaContent: "light dark" };
  }
  return { stored: target, metaContent: target };
}

export function initThemeToggle(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  const toggleBtns = document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]");
  if (!meta || toggleBtns.length === 0) return;

  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  const applyMeta = (content: ColorSchemePreference) => {
    meta.setAttribute("content", content);
  };

  toggleBtns.forEach((toggleBtn) => {
    if (toggleBtn.dataset.themeInitialized === "true") return;
    toggleBtn.dataset.themeInitialized = "true";
    toggleBtn.addEventListener("click", () => {
      const next = computeNextColorScheme(meta.getAttribute("content"), mq.matches);
      applyMeta(next.metaContent);
      try {
        if (next.stored === null) {
          window.localStorage.removeItem(STORAGE_KEY);
        } else {
          window.localStorage.setItem(STORAGE_KEY, next.stored);
        }
      } catch {
        // Safe no-op when storage is blocked in private mode
      }
    });
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    applyMeta(normalizeStoredColorScheme(event.newValue));
  });
}
