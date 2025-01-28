import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { Currency, TextCurrency } from "@/components/Currency";

export const ConversionDisplay = ({
  label,
  date,
  calculatedUSD,
  calculatedBs,
}: {
  label: string;
  date?: string;
  calculatedUSD: number;
  calculatedBs: number;
}) => (
  <Div>
    <Typography type="subtitle">{label}</Typography>
    {date && <Typography>{date}</Typography>}
    <TextCurrency suffix="$  " value={calculatedUSD} />
    <TextCurrency value={calculatedBs} />
  </Div>
);
