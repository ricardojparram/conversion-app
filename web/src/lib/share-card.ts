export interface ShareCardPayload {
  topLabel: string;
  topSymbol: string;
  topAmountFormatted: string;
  bottomLabel: string;
  bottomSymbol: string;
  bottomAmountFormatted: string;
  directionSubtitle: string;
  activeRateLabel: string;
  activeRateFormatted: string;
  updatedDate: string;
  shareText: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isDarkModeActive(): boolean {
  const metaScheme = document
    .querySelector('meta[name="color-scheme"]')
    ?.getAttribute("content");
  if (metaScheme === "dark") return true;
  if (metaScheme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function buildShareCardSvg(
  payload: ShareCardPayload,
  isDark: boolean,
): string {
  const cardBg = isDark ? "#0c1b29" : "#ffffff";
  const gradTop = isDark ? "#102436" : "#ffffff";
  const textPrimary = isDark ? "#f8fafc" : "#182334";
  const textSecondary = isDark ? "#cbd5e1" : "#475569";
  const textMuted = isDark ? "#94a3b8" : "#64748b";
  const pillBg = isDark ? "#092622" : "#e8f5ec";
  const pillText = isDark ? "#34d399" : "#037c2f";
  const swapStroke = isDark ? "#22c55e" : "#16a249";
  const dividerStroke = isDark ? "#1a334d" : "#e2e8f0";

  const topLabel = escapeXml(payload.topLabel.toUpperCase());
  const topValue = escapeXml(`${payload.topSymbol} ${payload.topAmountFormatted}`);
  const bottomLabel = escapeXml(payload.bottomLabel.toUpperCase());
  const bottomValue = escapeXml(
    `${payload.bottomSymbol} ${payload.bottomAmountFormatted}`,
  );
  const subtitle = escapeXml(payload.directionSubtitle);
  const ratePill = escapeXml(
    `${payload.activeRateLabel}: ${payload.activeRateFormatted} Bs`,
  );
  const updated = escapeXml(`Actualizado: ${payload.updatedDate}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="920" viewBox="0 0 360 460" style="font-family: Poppins, system-ui, -apple-system, sans-serif;">
  <defs>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${gradTop}" />
      <stop offset="1" stop-color="${cardBg}" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="360" height="460" fill="url(#cardGrad)" />
  <g transform="translate(156, 34)">
    <rect width="48" height="48" rx="14" fill="#16a249" />
    <path d="M 36 18 L 25.8 28.2 L 19.8 22.2 L 12 30" fill="none" stroke="#095625" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 28.8 18 L 36 18 L 36 25.2" fill="none" stroke="#095625" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round" />
  </g>
  <text x="180" y="106" fill="${textPrimary}" font-size="21" font-weight="700" text-anchor="middle">Cambio rápido</text>
  <text x="180" y="125" fill="${textSecondary}" font-size="12.5" font-weight="500" text-anchor="middle">${subtitle}</text>
  <text x="180" y="162" fill="${textMuted}" font-size="12" font-weight="700" letter-spacing="1" text-anchor="middle">${topLabel}</text>
  <text x="180" y="200" fill="${textPrimary}" font-size="36" font-weight="700" text-anchor="middle">${topValue}</text>
  <g transform="translate(166, 216)">
    <path d="M7 3v18M3 7l4-4 4 4M17 21V3M21 17l-4 4-4-4" fill="none" stroke="${swapStroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
  </g>
  <text x="180" y="274" fill="${textMuted}" font-size="12" font-weight="700" letter-spacing="1" text-anchor="middle">${bottomLabel}</text>
  <text x="180" y="314" fill="${textPrimary}" font-size="36" font-weight="700" text-anchor="middle">${bottomValue}</text>
  <rect x="30" y="342" width="300" height="36" rx="18" fill="${pillBg}" />
  <text x="180" y="365" fill="${pillText}" font-size="13" font-weight="700" text-anchor="middle">${ratePill}</text>
  <line x1="48" y1="398" x2="312" y2="398" stroke="${dividerStroke}" stroke-width="1" />
  <text x="180" y="420" fill="${textMuted}" font-size="11.5" font-weight="500" text-anchor="middle">${updated}</text>
  <text x="180" y="438" fill="${textMuted}" font-size="11" font-weight="500" text-anchor="middle">Calculado y compartido desde Cambio rápido</text>
</svg>`;
}

async function svgToPngBlob(svgMarkup: string): Promise<Blob | null> {
  const svgBlob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to render SVG"));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, 720, 920);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function shareCard(payload: ShareCardPayload): Promise<void> {
  const isDark = isDarkModeActive();
  const svg = buildShareCardSvg(payload, isDark);
  const pngBlob = await svgToPngBlob(svg);

  if (pngBlob) {
    const file = new File([pngBlob], "cambio-rapido.png", {
      type: "image/png",
    });

    if (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          text: payload.shareText,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    // Download fallback
    const downloadUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "cambio-rapido.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  try {
    await navigator.clipboard.writeText(payload.shareText);
  } catch {
    // Ignore clipboard errors
  }

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text: payload.shareText });
    } catch {
      // User dismissed share sheet
    }
  }
}
