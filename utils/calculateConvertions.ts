export const convertAmount = (
  amount: number,
  rate: number,
  direction: "bsToUsd" | "usdToBs"
): number => {
  if (rate === 0) {
    return 0;
  }
  if (direction === "bsToUsd") {
    return amount / rate;
  } else {
    return amount * rate;
  }
};