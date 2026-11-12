interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type NavigatorWithInstall = Navigator & {
  install?: () => Promise<void>;
  standalone?: boolean;
};

type DocumentWithAriaNotify = Document & {
  ariaNotify?: (
    announcement: string,
    options?: { priority?: "normal" | "high" },
  ) => void;
};

export const PWA_INSTALL_DISMISS_STORAGE_KEY = "cr-pwa-install-dismissed-at";
export const PWA_INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

let pwaInitialized = false;

export function isRunningStandalonePwa(
  matchMediaStandalone: boolean,
  navigatorStandalone: boolean,
): boolean {
  return Boolean(matchMediaStandalone || navigatorStandalone);
}

export function isIosSafariInstallEligible(
  userAgent: string,
  maxTouchPoints: number,
  isStandalone: boolean,
): boolean {
  if (isStandalone) return false;
  const isAppleTouchDevice =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  if (!isAppleTouchDevice) return false;

  return (
    /Safari/i.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android|DuckDuckGo|YaBrowser/i.test(userAgent)
  );
}

export function isInstallBannerDismissed(
  rawDismissedAt: string | null | undefined,
  nowMs: number = Date.now(),
  cooldownMs: number = PWA_INSTALL_DISMISS_COOLDOWN_MS,
): boolean {
  if (!rawDismissedAt) return false;
  const ts = Number(rawDismissedAt);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const elapsed = nowMs - ts;
  return elapsed >= 0 && elapsed < cooldownMs;
}

export function shouldShowInstallBanner(params: {
  isStandalone: boolean;
  canInstall: boolean;
  isDismissed: boolean;
  hasOpenModalDialog: boolean;
}): boolean {
  return (
    !params.isStandalone &&
    params.canInstall &&
    !params.isDismissed &&
    !params.hasOpenModalDialog
  );
}

function readStoredDismissedAt(): string | null {
  try {
    return window.localStorage.getItem(PWA_INSTALL_DISMISS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistDismissedAt(timestampMs: number = Date.now()): void {
  try {
    window.localStorage.setItem(PWA_INSTALL_DISMISS_STORAGE_KEY, String(timestampMs));
  } catch {
    // Safe no-op in restricted/private storage modes
  }
}

function announceInstallPrompt(message: string): void {
  const doc = document as DocumentWithAriaNotify;
  if (typeof doc.ariaNotify === "function") {
    try {
      doc.ariaNotify(message);
      return;
    } catch {
      // Fall back to live region if ariaNotify throws in experimental builds
    }
  }

  const liveRegion = document.getElementById("app-live-region");
  if (liveRegion) {
    liveRegion.textContent = message;
  }
}

export function initPwa(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (pwaInitialized) return;
  pwaInitialized = true;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Safe no-op in restricted browser contexts
    });
  }

  const installBtn = document.querySelector<HTMLButtonElement>("[data-pwa-install]");
  const installStatus = document.querySelector<HTMLElement>("[data-pwa-status]");
  const iosHint = document.querySelector<HTMLDetailsElement>("[data-pwa-ios-hint]");

  const banner = document.querySelector<HTMLElement>("[data-pwa-install-banner]");
  const bannerInstallBtn = document.querySelector<HTMLButtonElement>(
    "[data-pwa-banner-install]",
  );
  const bannerDismissBtn = document.querySelector<HTMLButtonElement>(
    "[data-pwa-banner-dismiss]",
  );

  const nav = navigator as NavigatorWithInstall;
  const matchMediaStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const isStandalone = isRunningStandalonePwa(
    matchMediaStandalone,
    Boolean(nav.standalone),
  );

  if (iosHint) {
    const showIosHint = isIosSafariInstallEligible(
      navigator.userAgent,
      navigator.maxTouchPoints ?? 0,
      isStandalone,
    );
    iosHint.hidden = !showIosHint;
  }

  if (isStandalone) return;

  const supportsWebInstall =
    typeof Navigator !== "undefined" &&
    typeof (Navigator.prototype as NavigatorWithInstall).install === "function";

  const supportsNativePopover =
    banner !== null &&
    typeof HTMLElement !== "undefined" &&
    Object.hasOwn(HTMLElement.prototype, "popover") &&
    typeof banner.showPopover === "function" &&
    typeof banner.hidePopover === "function";

  let deferredInstallPrompt: BeforeInstallPromptEvent | undefined;
  let bannerDismissedInSession = false;
  let lastFocusedOutsideBanner: HTMLElement | null = null;
  let shouldRestoreFocusOnClose = false;

  document.addEventListener(
    "focusin",
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        banner &&
        !banner.contains(target)
      ) {
        lastFocusedOutsideBanner = target;
      }
    },
    true,
  );

  const restoreFocusIfNeeded = () => {
    if (!shouldRestoreFocusOnClose) return;
    shouldRestoreFocusOnClose = false;
    if (
      lastFocusedOutsideBanner &&
      document.contains(lastFocusedOutsideBanner) &&
      (!banner || !banner.contains(lastFocusedOutsideBanner))
    ) {
      lastFocusedOutsideBanner.focus();
      return;
    }
    const main = document.getElementById("main-content");
    if (main instanceof HTMLElement) {
      main.focus();
    }
  };

  const setStatus = (message: string) => {
    if (!installStatus) return;
    installStatus.textContent = message;
    installStatus.hidden = false;
  };

  const showBanner = () => {
    if (!banner || bannerDismissedInSession) return;
    const canInstallNow = supportsWebInstall || Boolean(deferredInstallPrompt);
    const hasOpenModalDialog = Boolean(document.querySelector("dialog[open]"));
    const isDismissed = isInstallBannerDismissed(readStoredDismissedAt());

    if (
      !shouldShowInstallBanner({
        isStandalone,
        canInstall: canInstallNow,
        isDismissed,
        hasOpenModalDialog,
      })
    ) {
      return;
    }

    const alreadyOpen = supportsNativePopover
      ? banner.matches(":popover-open")
      : banner.hasAttribute("data-fallback-open");
    if (alreadyOpen) return;

    banner.hidden = false;
    if (supportsNativePopover) {
      try {
        banner.showPopover();
      } catch {
        banner.setAttribute("data-fallback-open", "true");
      }
    } else {
      banner.setAttribute("data-fallback-open", "true");
    }

    announceInstallPrompt(
      "Instala Cambio rápido directo en tu pantalla de inicio. Acciones disponibles.",
    );
  };

  const hideBanner = (options?: { restoreFocus?: boolean }) => {
    if (!banner) return;
    shouldRestoreFocusOnClose = Boolean(
      options?.restoreFocus && banner.contains(document.activeElement),
    );

    if (supportsNativePopover) {
      if (banner.matches(":popover-open")) {
        try {
          banner.hidePopover();
        } catch {
          banner.hidden = true;
          restoreFocusIfNeeded();
        }
      } else {
        banner.hidden = true;
        restoreFocusIfNeeded();
      }
    } else {
      banner.removeAttribute("data-fallback-open");
      banner.hidden = true;
      restoreFocusIfNeeded();
    }
  };

  if (banner && supportsNativePopover) {
    banner.addEventListener("toggle", (event) => {
      const nextState = (event as Event & { newState?: string }).newState;
      if (nextState === "closed") {
        banner.hidden = true;
        restoreFocusIfNeeded();
      }
    });
  }

  if (bannerDismissBtn) {
    bannerDismissBtn.addEventListener("click", (event) => {
      bannerDismissedInSession = true;
      persistDismissedAt();
      const viaKeyboard = event.detail === 0;
      if (supportsNativePopover) {
        shouldRestoreFocusOnClose = Boolean(
          viaKeyboard && banner?.contains(document.activeElement),
        );
      } else {
        hideBanner({ restoreFocus: viaKeyboard });
      }
    });
  }

  // Defer toast reveal while a modal <dialog> is open and reveal cleanly once closed
  document.addEventListener(
    "close",
    (event) => {
      if (event.target instanceof HTMLDialogElement) {
        showBanner();
      }
    },
    true,
  );

  if (supportsWebInstall) {
    if (installBtn) installBtn.hidden = false;
    showBanner();
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    if (installBtn && !supportsWebInstall) {
      installBtn.hidden = false;
    }
    showBanner();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = undefined;
    if (installBtn) installBtn.hidden = true;
    if (iosHint) iosHint.hidden = true;
    hideBanner();
    setStatus("Cambio rápido instalada en tu dispositivo.");
  });

  const handleInstallClick = async (triggerBtn: HTMLButtonElement) => {
    if (triggerBtn.getAttribute("aria-disabled") === "true") return;
    triggerBtn.setAttribute("aria-disabled", "true");
    if (installBtn && installBtn !== triggerBtn) {
      installBtn.setAttribute("aria-disabled", "true");
    }
    if (bannerInstallBtn && bannerInstallBtn !== triggerBtn) {
      bannerInstallBtn.setAttribute("aria-disabled", "true");
    }

    try {
      if (supportsWebInstall && typeof nav.install === "function") {
        // Call directly inside click handler to retain transient user activation
        await nav.install();
        setStatus("Aplicación instalada o abierta.");
        if (installBtn) installBtn.hidden = true;
        hideBanner({ restoreFocus: triggerBtn === bannerInstallBtn });
      } else if (deferredInstallPrompt) {
        // Consume and discard single-use prompt event before awaiting choice
        const promptEvent = deferredInstallPrompt;
        deferredInstallPrompt = undefined;
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          setStatus("Cambio rápido instalada correctamente.");
          hideBanner({ restoreFocus: triggerBtn === bannerInstallBtn });
        } else {
          setStatus("Instalación cancelada.");
          bannerDismissedInSession = true;
          persistDismissedAt();
          hideBanner({ restoreFocus: triggerBtn === bannerInstallBtn });
        }
        if (installBtn && !deferredInstallPrompt) {
          installBtn.hidden = true;
        }
      }
    } catch (error) {
      const errName = error instanceof Error ? error.name : "";
      if (errName === "AbortError") {
        setStatus("Instalación cancelada.");
        if (triggerBtn === bannerInstallBtn) {
          bannerDismissedInSession = true;
          persistDismissedAt();
          hideBanner({ restoreFocus: true });
        }
      } else {
        setStatus("No se pudo iniciar la instalación.");
      }
    } finally {
      installBtn?.removeAttribute("aria-disabled");
      bannerInstallBtn?.removeAttribute("aria-disabled");
    }
  };

  installBtn?.addEventListener("click", () => {
    void handleInstallClick(installBtn);
  });

  bannerInstallBtn?.addEventListener("click", () => {
    void handleInstallClick(bannerInstallBtn);
  });
}
