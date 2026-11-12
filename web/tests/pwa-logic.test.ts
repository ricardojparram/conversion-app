import { describe, expect, it } from "vitest";
import {
  PWA_INSTALL_DISMISS_COOLDOWN_MS,
  isInstallBannerDismissed,
  isIosSafariInstallEligible,
  isRunningStandalonePwa,
  shouldShowInstallBanner,
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

  it("respects 7-day dismissal cooldown and rejects malformed timestamps", () => {
    const now = 1_700_000_000_000;
    expect(isInstallBannerDismissed(null, now)).toBe(false);
    expect(isInstallBannerDismissed("", now)).toBe(false);
    expect(isInstallBannerDismissed("not-a-number", now)).toBe(false);
    expect(isInstallBannerDismissed("0", now)).toBe(false);

    // Dismissed 1 hour ago -> still within cooldown
    expect(isInstallBannerDismissed(String(now - 3_600_000), now)).toBe(true);

    // Dismissed right at cooldown expiry -> eligible again
    expect(
      isInstallBannerDismissed(String(now - PWA_INSTALL_DISMISS_COOLDOWN_MS), now),
    ).toBe(false);

    // Future clock skew -> treated as expired
    expect(isInstallBannerDismissed(String(now + 60_000), now)).toBe(false);
  });

  it("reveals install banner only when installable, non-standalone, undismissed, and no modal dialog is open", () => {
    expect(
      shouldShowInstallBanner({
        isStandalone: false,
        canInstall: true,
        isDismissed: false,
        hasOpenModalDialog: false,
      }),
    ).toBe(true);

    expect(
      shouldShowInstallBanner({
        isStandalone: true,
        canInstall: true,
        isDismissed: false,
        hasOpenModalDialog: false,
      }),
    ).toBe(false);

    expect(
      shouldShowInstallBanner({
        isStandalone: false,
        canInstall: false,
        isDismissed: false,
        hasOpenModalDialog: false,
      }),
    ).toBe(false);

    expect(
      shouldShowInstallBanner({
        isStandalone: false,
        canInstall: true,
        isDismissed: true,
        hasOpenModalDialog: false,
      }),
    ).toBe(false);

    expect(
      shouldShowInstallBanner({
        isStandalone: false,
        canInstall: true,
        isDismissed: false,
        hasOpenModalDialog: true,
      }),
    ).toBe(false);
  });
});
