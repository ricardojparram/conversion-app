import { useState, useEffect } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { Currency, TextCurrency } from "@/components/Currency";
import { ConversionDisplay } from "@/components/Convertions";
import { calculateConversions } from "@/utils/calculateConvertions";
import { convertionStore } from "@/store/convertions";
import { Btn } from "@/components/Button";
import { CalculatedConvertions } from "@/types/convertions";

export default function Index() {
  const [bs, setBs] = useState(0);
  const [usd, setUSD] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const convertions = convertionStore((state) => state.convertions);
  const fetchConvertions = convertionStore((state) => state.fetchConvertions);
  const fetch = async () => {
    setIsFetching(true);
    await fetchConvertions();
    setIsFetching(false);
  };
  const [calculatedConvertions, setCalculated] =
    useState<CalculatedConvertions>({
      calculatedUSD: {
        bcv: 0,
        paralelo: 0,
        promedio: 0,
      },
      calculatedBs: {
        bcv: 0,
        paralelo: 0,
        promedio: 0,
      },
    });

  useEffect(() => {
    fetch();
  }, []);
  useEffect(() => {
    const data = calculateConversions(bs, usd, convertions);
    setCalculated(data);
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
      <Btn onPress={() => fetch()}>Refrescar</Btn>
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
      {isFetching && <Typography type="subtitle">Cargando...</Typography>}
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
          calculatedUSD={calculatedConvertions.calculatedUSD.paralelo}
          calculatedBs={calculatedConvertions.calculatedBs.paralelo}
        />

        <ConversionDisplay
          label="BCV"
          date={convertions.dateBcv}
          calculatedUSD={calculatedConvertions.calculatedUSD.bcv}
          calculatedBs={calculatedConvertions.calculatedBs.bcv}
        />
        <ConversionDisplay
          label="Promedio"
          calculatedUSD={calculatedConvertions.calculatedUSD.promedio}
          calculatedBs={calculatedConvertions.calculatedBs.promedio}
        />
      </Div>
    </Div>
  );
}
