import { useState, useEffect } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { ScrollDiv } from "@/components/ScrollDiv";
import { Currency, TextCurrency } from "@/components/Currency";
import { ConversionDisplay } from "@/components/Convertions";
import { calculateConversions } from "@/utils/calculateConvertions";
import { convertionStore } from "@/store/convertions";
import { CalculatedConvertions } from "@/types/convertions";
import { IconBtn } from "@/components/Btn";
import { ActivityIndicator } from "react-native";

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
    <>
      <ScrollDiv>
        <Div
          style={{
            flex: 1,
            position: "relative",
            alignItems: "center",
            paddingTop: 30,
            padding: 10,
          }}
        >
          <Typography type="title">Cambio rápido</Typography>

          <Div style={{ position: "absolute", right: 10, top: 10 }}>
            <IconBtn onPress={fetch} icon="refresh" size={30} />
          </Div>
          <Div
            style={{
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

          <Div
            style={{
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
      </ScrollDiv>

      {isFetching && (
        <Div
          style={{
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <ActivityIndicator size="large" color="white" />
        </Div>
      )}
    </>
  );
}
