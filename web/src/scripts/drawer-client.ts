import type { ResolvedRate } from "@/lib/rates/types";
import { initHistoryPanel } from "./history-client";

export function initHistoryDrawer(): void {
  if (typeof document === "undefined") return;
  const dialog = document.getElementById("history-dialog") as HTMLDialogElement | null;
  if (!dialog) return;

  const panel = dialog.querySelector<HTMLElement>("[data-history-panel]");
  const closeBtn = dialog.querySelector<HTMLButtonElement>("[data-dialog-close]");
  const dragHeader = dialog.querySelector<HTMLElement>("[data-drawer-handle]");
  const sheet = dialog.querySelector<HTMLElement>("[data-dialog-sheet]");
  const controller = panel ? initHistoryPanel(panel) : null;

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      dialog.close();
    });
  }

  // Fallback light-dismiss for Safari / browsers without <dialog closedby>
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const targetBox = sheet ?? dialog;
      const rect = targetBox.getBoundingClientRect();
      const insideContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!insideContent) {
        dialog.close();
      }
    });
  }

  // Also close when clicking outside sheet inside full-bleed bottom-drawer wrapper
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && sheet) {
      const rect = sheet.getBoundingClientRect();
      const insideSheet =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!insideSheet) {
        dialog.close();
      }
    }
  });

  // Swipe-down gesture on mobile drag handle preserving native vertical page scroll safety
  if (dragHeader && sheet) {
    let startY = 0;
    let deltaY = 0;
    let dragging = false;

    dragHeader.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) return;
        startY = event.touches[0].clientY;
        deltaY = 0;
        dragging = true;
      },
      { passive: true },
    );

    dragHeader.addEventListener(
      "touchmove",
      (event) => {
        if (!dragging || event.touches.length !== 1) return;
        deltaY = Math.max(0, event.touches[0].clientY - startY);
        sheet.style.transform = `translateY(${deltaY}px)`;
      },
      { passive: true },
    );

    const endTouch = () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transform = "";
      if (deltaY > 110) {
        dialog.close();
      }
      deltaY = 0;
    };

    dragHeader.addEventListener("touchend", endTouch, { passive: true });
    dragHeader.addEventListener("touchcancel", endTouch, { passive: true });
  }

  window.addEventListener("cr:open-history", (event) => {
    const customEvent = event as CustomEvent<{
      currencyId?: number;
      rates?: ResolvedRate[];
    }>;
    const currencyId = customEvent.detail?.currencyId ?? 1;
    const rates = customEvent.detail?.rates;

    if (!dialog.open) {
      dialog.showModal();
    }
    if (controller) {
      void controller.loadForCurrency(currencyId, rates);
    }
  });
}
