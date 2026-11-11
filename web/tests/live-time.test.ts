import { describe, expect, it } from "vitest";
import { syncLiveTimeElement, updateLiveTimeElement } from "@/scripts/live-time";

function createFakeTimeElement(initialAttrs: Record<string, string> = {}, initialText = "") {
  const attrs = new Map<string, string>(Object.entries(initialAttrs));
  return {
    textContent: initialText,
    getAttribute(name: string): string | null {
      return attrs.get(name) ?? null;
    },
    setAttribute(name: string, value: string): void {
      attrs.set(name, String(value));
    },
    removeAttribute(name: string): void {
      attrs.delete(name);
    },
    attrs,
  };
}

describe("live-time client helpers", () => {
  it("refreshes stale ISR 'Hoy' labels when the client clock rolls past midnight", () => {
    const el = createFakeTimeElement(
      {
        "data-raw-date": "2026-11-11T00:00:00",
        "data-include-time": "false",
        datetime: "2026-11-11",
      },
      "Hoy",
    );

    const nextDayNow = new Date("2026-11-12T08:15:00-04:00");
    updateLiveTimeElement(el as unknown as Element, nextDayNow);
    expect(el.textContent).toBe("Ayer");
  });

  it("updates attributes and formats natural intraday, future, and empty offline states", () => {
    const el = createFakeTimeElement();
    const now = new Date("2026-11-11T15:30:00-04:00");

    syncLiveTimeElement(el as unknown as Element, "2026-11-11T15:25:00", {
      includeTime: true,
      now,
    });
    expect(el.textContent).toBe("hace 5 min");
    expect(el.getAttribute("data-include-time")).toBe("true");
    expect(el.getAttribute("datetime")).toBe("2026-11-11T19:25:00.000Z");

    syncLiveTimeElement(el as unknown as Element, "2026-11-12T00:00:00", {
      includeTime: false,
      future: true,
      now,
    });
    expect(el.textContent).toBe("mañana (12/11)");
    expect(el.getAttribute("data-live-future")).toBe("true");
    expect(el.getAttribute("datetime")).toBe("2026-11-12");

    syncLiveTimeElement(el as unknown as Element, null, {
      emptyText: "Sin conexión",
      now,
    });
    expect(el.textContent).toBe("Sin conexión");
    expect(el.getAttribute("data-raw-date")).toBeNull();
    expect(el.getAttribute("datetime")).toBeNull();
  });
});
