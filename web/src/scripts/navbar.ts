export function initNavbar(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const menuBtn = document.querySelector<HTMLButtonElement>("[data-mobile-nav-toggle]");
  const dialog = document.getElementById("mobile-nav-dialog") as HTMLDialogElement | null;
  if (!menuBtn || !dialog || dialog.dataset.navInitialized === "true") return;
  dialog.dataset.navInitialized = "true";

  const closeBtn = dialog.querySelector<HTMLButtonElement>("[data-mobile-nav-close]");
  const desktopMq = window.matchMedia("(min-width: 54rem)");

  const syncClosedState = () => {
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Abrir menú de navegación");
  };

  const closeDialog = () => {
    if (dialog.open) {
      dialog.close();
    } else {
      syncClosedState();
    }
  };

  if (desktopMq.matches && dialog.open) {
    closeDialog();
  }

  menuBtn.addEventListener("click", () => {
    if (desktopMq.matches) return;
    if (dialog.open) {
      closeDialog();
    } else {
      dialog.showModal();
      menuBtn.setAttribute("aria-expanded", "true");
      menuBtn.setAttribute("aria-label", "Cerrar menú de navegación");
    }
  });

  closeBtn?.addEventListener("click", () => {
    closeDialog();
  });

  if (!("closedBy" in HTMLDialogElement.prototype)) {
    const outside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };
    let pressedOutside = false;
    dialog.addEventListener("pointerdown", (event) => {
      pressedOutside = outside(event);
    });
    dialog.addEventListener("pointerup", (event) => {
      if (pressedOutside && outside(event)) closeDialog();
    });
  }

  dialog.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeDialog();
    });
  });

  dialog.addEventListener("close", () => {
    syncClosedState();
  });

  desktopMq.addEventListener("change", (event) => {
    if (event.matches && dialog.open) {
      closeDialog();
    }
  });
}
