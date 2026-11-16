import { formatNumber } from "@/lib/rates/format";
import { shareCard } from "@/lib/share-card";

const fmt = (n: number) =>
  formatNumber(n, { delimiter: ".", separator: ",", precision: 2 });

function initBrecha() {
  const root = document.querySelector<HTMLElement>("[data-brecha-root]");
  if (!root) return;

  let bcvRate = Number(root.dataset.bcvRate) || 899.27;
  let marketRate = Number(root.dataset.marketRate) || 1074.76;

  const simButtons = root.querySelectorAll<HTMLButtonElement>("[data-sim-amount]");
  const simBcvEl = root.querySelector<HTMLElement>("[data-sim-bcv]");
  const simP2pEl = root.querySelector<HTMLElement>("[data-sim-p2p]");
  const simDiffBsEl = root.querySelector<HTMLElement>("[data-sim-diff-bs]");
  const simDiffUsdEl = root.querySelector<HTMLElement>("[data-sim-diff-usd]");
  const shareBtn = root.querySelector<HTMLButtonElement>("[data-brecha-share]");
  const heroPctEl = root.querySelector<HTMLElement>("[data-brecha-hero-pct]");
  const diffPerUsdEl = root.querySelector<HTMLElement>("[data-brecha-diff-usd]");
  const bcvRateEl = root.querySelector<HTMLElement>("[data-brecha-bcv-rate]");
  const marketRateEl = root.querySelector<HTMLElement>("[data-brecha-market-rate]");

  let monto = 50;

  function update() {
    const diffBs = Math.round((marketRate - bcvRate) * 100) / 100;
    const spreadPct =
      bcvRate > 0
        ? (((marketRate - bcvRate) / bcvRate) * 100).toFixed(2).replace(".", ",")
        : "0,00";

    if (heroPctEl) heroPctEl.textContent = `+${spreadPct}%`;
    if (diffPerUsdEl) diffPerUsdEl.textContent = `+${fmt(diffBs)} Bs por $1`;
    if (bcvRateEl) bcvRateEl.textContent = `${fmt(bcvRate)} Bs`;
    if (marketRateEl) marketRateEl.textContent = `${fmt(marketRate)} Bs`;

    const totalBcv = Math.round(monto * bcvRate * 100) / 100;
    const totalP2p = Math.round(monto * marketRate * 100) / 100;
    const diffTotal = Math.round((totalP2p - totalBcv) * 100) / 100;
    const diffUsd =
      bcvRate > 0 ? (diffTotal / bcvRate).toFixed(2).replace(".", ",") : "0,00";

    if (simBcvEl) simBcvEl.textContent = `${fmt(totalBcv)} Bs`;
    if (simP2pEl) simP2pEl.textContent = `${fmt(totalP2p)} Bs`;
    if (simDiffBsEl) simDiffBsEl.textContent = `+${fmt(diffTotal)} Bs`;
    if (simDiffUsdEl) simDiffUsdEl.textContent = `+$${diffUsd} USD a BCV`;

    simButtons.forEach((btn) => {
      const active = Number(btn.dataset.simAmount) === monto;
      btn.setAttribute("aria-pressed", String(active));
      if (active) {
        btn.className =
          "rounded-full px-3.5 py-1.5 text-xs font-bold tabular-nums whitespace-nowrap transition-colors bg-[#037c2f] text-white dark:bg-[#16a249]";
      } else {
        btn.className =
          "rounded-full px-3.5 py-1.5 text-xs font-bold tabular-nums whitespace-nowrap transition-colors text-[var(--cr-text-secondary)] hover:text-[var(--cr-text)]";
      }
    });
  }

  simButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      monto = Number(btn.dataset.simAmount) || 50;
      update();
    });
  });

  shareBtn?.addEventListener("click", () => {
    const diffBs = Math.round((marketRate - bcvRate) * 100) / 100;
    const spreadPct =
      bcvRate > 0
        ? (((marketRate - bcvRate) / bcvRate) * 100).toFixed(2).replace(".", ",")
        : "0,00";
    const totalBcv = Math.round(monto * bcvRate * 100) / 100;
    const totalP2p = Math.round(monto * marketRate * 100) / 100;
    const diffTotal = Math.round((totalP2p - totalBcv) * 100) / 100;
    const diffUsd =
      bcvRate > 0 ? (diffTotal / bcvRate).toFixed(2).replace(".", ",") : "0,00";

    const shareText = `Brecha cambiaria hoy: +${spreadPct}% (+${fmt(diffBs)} Bs por $1)\n• Dólar BCV: ${fmt(bcvRate)} Bs\n• Mercado P2P: ${fmt(marketRate)} Bs\nEn $${monto} USD la diferencia es +${fmt(diffTotal)} Bs (+$${diffUsd} USD a BCV).\nCalculado con Cambio rápido`;

    void shareCard({
      topLabel: "Tasa BCV Oficial",
      topSymbol: "Bs",
      topAmountFormatted: fmt(bcvRate),
      bottomLabel: "Mercado P2P",
      bottomSymbol: "Bs",
      bottomAmountFormatted: fmt(marketRate),
      directionSubtitle: `Brecha del día: +${spreadPct}%`,
      activeRateLabel: "Diferencia por $1",
      activeRateFormatted: `+${fmt(diffBs)}`,
      updatedDate: "hoy",
      shareText,
    });
  });

  update();

  fetch("/api/rates.json")
    .then((res) => (res.ok ? res.json() : null))
    .then(
      (
        data: {
          rates?: Array<{
            source?: string;
            code?: string;
            currency_name?: string;
            effectiveRate?: number;
            rate?: number;
          }>;
        } | null,
      ) => {
        const list = data?.rates ?? [];
        if (list.length === 0) return;
        const bcvRow =
          list.find(
            (c) =>
              (c.source ?? "").toUpperCase() === "BCV" &&
              (c.code ?? "").toUpperCase() !== "EUR" &&
              !(c.currency_name ?? "").toLowerCase().includes("euro"),
          ) ?? list[0];
        const marketRow =
          list.find((c) =>
            (c.currency_name ?? "").toLowerCase().includes("venta"),
          ) ??
          list.find(
            (c) =>
              (c.source ?? "").toUpperCase() !== "BCV" &&
              (c.code ?? "").toUpperCase() !== "EUR",
          ) ??
          list[1];

        const nextBcv = bcvRow?.effectiveRate ?? bcvRow?.rate ?? 0;
        const nextMarket = marketRow?.effectiveRate ?? marketRow?.rate ?? 0;
        if (nextBcv > 0 && nextMarket > 0) {
          bcvRate = nextBcv;
          marketRate = nextMarket;
          update();
        }
      },
    )
    .catch(() => {});
}

initBrecha();
document.addEventListener("astro:page-load", initBrecha);
