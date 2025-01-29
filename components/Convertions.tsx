import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { TextCurrency } from "@/components/Currency";
import { useThemeColor } from "@/hooks/useThemeColor";
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
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
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
        <Typography>
          <TextCurrency suffix="$ " value={calculatedUSD} /> ={"  "}
          <TextCurrency value={calculatedBs} />
        </Typography>
      </Div>

      <Div style={{ flexDirection: "row", gap: 20 }}>
        <Btn
          icon="clipboard-multiple-outline"
          onPress={() => console.log("copiar")}
        >
          USD
        </Btn>

        <Btn
          icon="clipboard-multiple-outline"
          onPress={() => console.log("copiar")}
        >
          BS
        </Btn>
      </Div>
    </Div>
  );
};
