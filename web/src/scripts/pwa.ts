interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type NavigatorWithInstall = Navigator & {
  install?: () => Promise<void>;
  standalone?: boolean;
};

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

  if (!installBtn || isStandalone) return;

  const supportsWebInstall =
    typeof Navigator !== "undefined" &&
    typeof (Navigator.prototype as NavigatorWithInstall).install === "function";

  let deferredInstallPrompt: BeforeInstallPromptEvent | undefined;

  const setStatus = (message: string) => {
    if (!installStatus) return;
    installStatus.textContent = message;
    installStatus.hidden = false;
  };

  if (supportsWebInstall) {
    installBtn.hidden = false;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    if (!supportsWebInstall) {
      installBtn.hidden = false;
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = undefined;
    installBtn.hidden = true;
    if (iosHint) iosHint.hidden = true;
    setStatus("Cambio rápido instalada en tu dispositivo.");
  });

  installBtn.addEventListener("click", async () => {
    if (installBtn.getAttribute("aria-disabled") === "true") return;
    installBtn.setAttribute("aria-disabled", "true");

    try {
      if (supportsWebInstall && typeof nav.install === "function") {
        await nav.install();
        setStatus("Aplicación instalada o abierta.");
        installBtn.hidden = true;
      } else if (deferredInstallPrompt) {
        const promptEvent = deferredInstallPrompt;
        deferredInstallPrompt = undefined;
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        setStatus(
          outcome === "accepted"
            ? "Cambio rápido instalada correctamente."
            : "Instalación cancelada.",
        );
        if (!deferredInstallPrompt) {
          installBtn.hidden = true;
        }
      }
    } catch (error) {
      const errName = error instanceof Error ? error.name : "";
      if (errName === "AbortError") {
        setStatus("Instalación cancelada.");
      } else {
        setStatus("No se pudo iniciar la instalación.");
      }
    } finally {
      installBtn.removeAttribute("aria-disabled");
    }
  });
}
