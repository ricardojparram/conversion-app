import { parseDigitsToCents } from "@/lib/rates/calculator";
import { formatNumber } from "@/lib/rates/format";
import { shareCard } from "@/lib/share-card";

const fmt = (n: number) =>
  formatNumber(n, { delimiter: ".", separator: ",", precision: 2 });

function initComparador() {
  const root = document.querySelector<HTMLElement>("[data-comparador-root]");
  if (!root) return;

  let bcvRate = Number(root.dataset.bcvRate) || 899.27;
  let marketRate = Number(root.dataset.marketRate) || 1074.76;

  const inputBcv = root.querySelector<HTMLInputElement>("[data-input-bcv]");
  const inputOffer = root.querySelector<HTMLInputElement>("[data-input-offer]");
  const bcvBsPreview = root.querySelector<HTMLElement>("[data-bcv-bs-preview]");
  const offerBsPreview = root.querySelector<HTMLElement>("[data-offer-bs-preview]");
  const verdictTitle = root.querySelector<HTMLElement>("[data-verdict-title]");
  const savingsPill = root.querySelector<HTMLElement>("[data-savings-pill]");
  const verdictSubline = root.querySelector<HTMLElement>("[data-verdict-subline]");
  const shareBtn = root.querySelector<HTMLButtonElement>("[data-comparador-share]");

  let bcvCents = 12000;
  let offerCents = 9000;

  let currentSharePayload = {
    topLabel: "Precio BCV",
    topSymbol: "$",
    topAmountFormatted: "120,00",
    bottomLabel: "Oferta en divisas",
    bottomSymbol: "$",
    bottomAmountFormatted: "90,00",
    directionSubtitle: "Te conviene pagar: En Divisas",
    activeRateLabel: "Ahorras",
    activeRateFormatted: "$0,00",
    updatedDate: "hoy",
    shareText: "",
  };

  function update() {
    const safeBcvUsd = bcvCents / 100;
    const safeOfferUsd = offerCents / 100;

    if (inputBcv) inputBcv.value = fmt(safeBcvUsd);
    if (inputOffer) inputOffer.value = fmt(safeOfferUsd);

    const totalBsToPay = Math.round(safeBcvUsd * bcvRate * 100) / 100;
    const offerInBs = Math.round(safeOfferUsd * marketRate * 100) / 100;
    const usdNeededSellingParalelo =
      marketRate > 0 ? Math.round((totalBsToPay / marketRate) * 100) / 100 : 0;

    const diffUsd =
      Math.round((usdNeededSellingParalelo - safeOfferUsd) * 100) / 100;
    const absDiffUsd = Math.abs(diffUsd);
    const absDiffBs = Math.round(absDiffUsd * marketRate * 100) / 100;

    const isDivisasWinner = diffUsd > 0.05;
    const isBsWinner = diffUsd < -0.05;

    let winnerActionName = "Empate";
    let subline = "Ambas opciones representan exactamente el mismo costo real.";

    if (isDivisasWinner) {
      winnerActionName = "En Divisas";
      subline = `En bolívares gastarías $${fmt(usdNeededSellingParalelo)} vendiendo a paralelo (${fmt(absDiffBs)} Bs más).`;
    } else if (isBsWinner) {
      winnerActionName = "En Bolívares";
      subline = `En divisas gastarías $${fmt(safeOfferUsd)} (${fmt(absDiffBs)} Bs más).`;
    }

    if (bcvBsPreview) bcvBsPreview.textContent = `${fmt(totalBsToPay)} Bs`;
    if (offerBsPreview) offerBsPreview.textContent = `${fmt(offerInBs)} Bs`;
    if (verdictTitle) verdictTitle.textContent = winnerActionName;
    if (savingsPill) savingsPill.textContent = `Ahorras $${fmt(absDiffUsd)}`;
    if (verdictSubline) verdictSubline.textContent = subline;

    const shareText = `¿Cómo conviene pagar?\nPrecio BCV: $${fmt(safeBcvUsd)} (${fmt(totalBsToPay)} Bs)\nOferta en divisas: $${fmt(safeOfferUsd)}\n\nTe conviene pagar: ${winnerActionName} (Ahorras $${fmt(absDiffUsd)})\n${subline}\nCalculado con Cambio rápido`;

    currentSharePayload = {
      topLabel: "Precio BCV",
      topSymbol: "$",
      topAmountFormatted: fmt(safeBcvUsd),
      bottomLabel: "Oferta en divisas",
      bottomSymbol: "$",
      bottomAmountFormatted: fmt(safeOfferUsd),
      directionSubtitle: `Te conviene pagar: ${winnerActionName}`,
      activeRateLabel: "Ahorras",
      activeRateFormatted: `$${fmt(absDiffUsd)}`,
      updatedDate: "hoy",
      shareText,
    };
  }

  inputBcv?.addEventListener("input", () => {
    bcvCents = parseDigitsToCents(inputBcv.value) ?? 0;
    update();
  });

  inputOffer?.addEventListener("input", () => {
    offerCents = parseDigitsToCents(inputOffer.value) ?? 0;
    update();
  });

  shareBtn?.addEventListener("click", () => {
    void shareCard(currentSharePayload);
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

initComparador();
document.addEventListener("astro:page-load", initComparador);
