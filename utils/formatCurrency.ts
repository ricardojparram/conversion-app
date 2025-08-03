import { formatNumber } from "react-native-currency-input";
export const formatCurrency = (val: number, suffix: string,

    delimiter: string = ".",
    separator: string = ",",
    precision: number = 2,
) => formatNumber(val, {
    suffix: " " + suffix,
    delimiter,
    separator,
    precision,
});