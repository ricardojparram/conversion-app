import { useState, useEffect } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { Currency, TextCurrency } from "@/components/Currency";
import { ConversionDisplay } from "@/components/Convertions";
import { useFetchConvertions } from "@/hooks/useFetchConvertions";
import { calculateConversions } from "@/utils/calculateConvertions";

export default function Index() {
  const [bs, setBs] = useState(0);
  const [usd, setUSD] = useState(1);
  const [convertions, isFetching] = useFetchConvertions();

  const [calculatedBs, setCalculatedBs] = useState({
    bcv: 0,
    paralelo: 0,
    promedio: 0,
  });
  const [calculatedUSD, setCalculatedUSD] = useState({
    bcv: 0,
    paralelo: 0,
    promedio: 0,
  });

  useEffect(() => {
    const { calcUSD, calcBs } = calculateConversions(bs, usd, convertions);
    setCalculatedUSD(calcUSD);
    setCalculatedBs(calcBs);
  }, [usd, bs, convertions]);

  return (
    <Div
      style={{
        flex: 1,
        alignItems: "center",
        paddingTop: 50,
        padding: 20,
      }}
    >
      <Typography type="title">Cambio rápido</Typography>
      <Div
        style={{
          flex: 1,
          gap: 10,
          width: "100%",
          paddingVertical: 10,
          paddingHorizontal: 40,
        }}
      >
        <Currency
          value={bs}
          onChangeValue={setBs}
          onPress={() => setUSD(0)}
          label="Bolívares."
        />

        <Currency
          suffix="$  "
          value={usd}
          onChangeValue={setUSD}
          onPress={() => setBs(0)}
          label="Dólares."
        />
      </Div>
      {isFetching ? (
        <Typography type="subtitle">Cargando...</Typography>
      ) : (
        <Div
          style={{
            flex: 2,
            gap: 10,
            width: "100%",
            paddingVertical: 10,
            paddingHorizontal: 40,
          }}
        >
          <ConversionDisplay
            label="Paralelo"
            date={convertions.dateParalelo}
            calculatedUSD={calculatedUSD.paralelo}
            calculatedBs={calculatedBs.paralelo}
          />

          <ConversionDisplay
            label="BCV"
            date={convertions.dateBcv}
            calculatedUSD={calculatedUSD.bcv}
            calculatedBs={calculatedBs.bcv}
          />

          <ConversionDisplay
            label="Promedio"
            calculatedUSD={calculatedUSD.promedio}
            calculatedBs={calculatedBs.promedio}
          />
        </Div>
      )}
    </Div>
  );
}
