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

async function initNavBrechaBadge() {
  const badges = document.querySelectorAll<HTMLElement>("[data-nav-brecha-badge]");
  if (badges.length === 0) return;

  try {
    const res = await fetch("/api/rates.json");
    if (!res.ok) return;
    const data = (await res.json()) as {
      rates?: Array<{ source?: string; code?: string; currency_name?: string; effectiveRate?: number; rate?: number }>;
    };
    const list = data.rates ?? [];
    const bcvRow =
      list.find(
        (c) =>
          (c.source ?? "").toUpperCase() === "BCV" &&
          (c.code ?? "").toUpperCase() !== "EUR" &&
          !(c.currency_name ?? "").toLowerCase().includes("euro"),
      ) ?? list[0];
    const marketRow =
      list.find((c) => (c.currency_name ?? "").toLowerCase().includes("venta")) ??
      list.find(
        (c) =>
          (c.source ?? "").toUpperCase() !== "BCV" &&
          (c.code ?? "").toUpperCase() !== "EUR",
      ) ??
      list[1];

    const bcv = bcvRow?.effectiveRate ?? bcvRow?.rate ?? 0;
    const market = marketRow?.effectiveRate ?? marketRow?.rate ?? 0;
    if (bcv > 0 && market > 0) {
      const pct = (((market - bcv) / bcv) * 100).toFixed(1).replace(".", ",");
      const label = `+${pct}%`;
      badges.forEach((el) => {
        el.textContent = label;
      });
    }
  } catch {
    // Keep default badge text on network error
  }
}

function syncActiveNavLinks() {
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  document
    .querySelectorAll<HTMLAnchorElement>(".nav-link, .mobile-nav-link")
    .forEach((link) => {
      const href = (link.getAttribute("href") ?? "/").replace(/\/$/, "") || "/";
      const isActive = href === currentPath;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
}

initNavBrechaBadge();
syncActiveNavLinks();
document.addEventListener("astro:page-load", () => {
  initNavBrechaBadge();
  syncActiveNavLinks();
});
