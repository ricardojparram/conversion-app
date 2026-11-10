import { describe, expect, it } from "vitest";
import {
  isIosSafariInstallEligible,
  isRunningStandalonePwa,
} from "@/scripts/pwa";

describe("PWA eligibility helpers", () => {
  it("detects standalone mode cleanly", () => {
    expect(isRunningStandalonePwa(true, false)).toBe(true);
    expect(isRunningStandalonePwa(false, true)).toBe(true);
    expect(isRunningStandalonePwa(false, false)).toBe(false);
  });

  it("shows iOS Safari install help only on non-standalone iOS Safari (or iPadOS desktop UA)", () => {
    const iphoneSafari =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    const iphoneChrome =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1";
    const ipadDesktopMode =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
    const desktopChrome =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

    expect(isIosSafariInstallEligible(iphoneSafari, 5, false)).toBe(true);
    expect(isIosSafariInstallEligible(iphoneSafari, 5, true)).toBe(false);
    expect(isIosSafariInstallEligible(iphoneChrome, 5, false)).toBe(false);
    expect(isIosSafariInstallEligible(ipadDesktopMode, 5, false)).toBe(true);
    expect(isIosSafariInstallEligible(desktopChrome, 0, false)).toBe(false);
  });
});
