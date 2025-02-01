import { useState } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { TextCurrency } from "@/components/Currency";
import { setStringAsync } from "expo-clipboard";
import { Btn } from "@/components/Btn";

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
}) => {
  const [usdCopied, setUSDCopied] = useState<boolean>(false);
  const [bsCopied, setBSCopied] = useState<boolean>(false);
  const copyUSD = async () => {
    await setStringAsync(calculatedUSD.toFixed(2).toString());
    setUSDCopied(true);
    setTimeout(() => setUSDCopied(false), 1000);
  };
  const copyBs = async () => {
    await setStringAsync(calculatedBs.toFixed(2).toString());
    setBSCopied(true);
    setTimeout(() => setBSCopied(false), 1000);
  };
  return (
    <Div
      style={{
        borderStyle: "solid",
        padding: 10,
        gap: 5,
      }}
    >
      <Div
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignContent: "flex-end",
        }}
      >
        <Typography type="subtitle">{label}</Typography>
        {date && <Typography style={{ opacity: 0.7 }}>{date}</Typography>}
      </Div>

      <Div>
        <Typography type="subtitle">
          <TextCurrency suffix="$ " value={calculatedUSD} /> ={"  "}
          <TextCurrency value={calculatedBs} />
        </Typography>
      </Div>

      <Div style={{ flexDirection: "row", gap: 20 }}>
        {/* clipboard-check-multiple */}
        <Btn
          icon={
            usdCopied
              ? "clipboard-check-multiple"
              : "clipboard-multiple-outline"
          }
          onPress={copyUSD}
          className="notranslate"
        >
          USD
        </Btn>

        <Btn
          icon={
            bsCopied ? "clipboard-check-multiple" : "clipboard-multiple-outline"
          }
          onPress={copyBs}
          className="notranslate"
        >
          BS
        </Btn>
      </Div>
    </Div>
  );
};
