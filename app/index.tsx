import { useState, useEffect } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { ScrollDiv } from "@/components/ScrollDiv";
import { Currency } from "@/components/Currency";
import { ConversionDisplay } from "@/components/Convertions";
import { calculateConversions } from "@/utils/calculateConvertions";
import { convertionStore } from "@/store/convertions";
import { CalculatedConvertions } from "@/types/convertions";
import { IconBtn } from "@/components/Btn";
import { ActivityIndicator, Platform } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function Index() {
  const iconColor = useThemeColor({}, "icon");
  const [bs, setBs] = useState<number | null>(0);
  const [usd, setUSD] = useState<number | null>(0);
  const [isFetching, setIsFetching] = useState(false);
  const convertions = convertionStore((state) => state.convertions);
  const fetchConvertions = convertionStore((state) => state.fetchConvertions);
  const fetch = async () => {
    setBs(0);
    setUSD(0);
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
    // @ts-ignore
    const data = calculateConversions(bs, usd, convertions);
    setCalculated(data);
  }, [usd, bs, convertions]);

  return (
    <ScrollDiv>
      <Div
        style={[
          {
            width: "100%",
          },
          // @ts-ignore
          Platform.OS === "web" && {
            height: "100dvh",
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Div
          style={{
            alignItems: "center",
            paddingTop: 30,
            maxWidth: 400,
          }}
        >
          <Div
            style={{
              gap: 10,
              width: "100%",
              paddingVertical: 10,
              paddingHorizontal: 40,
            }}
          >
            <Div
              style={{
                width: "100%",
                justifyContent: "space-between",
                flexDirection: "row",
                height: 50,
              }}
            >
              <Typography
                type="title"
                style={{
                  textAlignVertical: "center",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Cambio rápido
              </Typography>

              <Div>
                {isFetching ? (
                  <ActivityIndicator
                    size="large"
                    color={iconColor}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  />
                ) : (
                  <IconBtn onPress={fetch} icon="refresh" size={35} />
                )}
              </Div>
            </Div>
            <Currency
              value={bs}
              onChangeValue={setBs}
              onFocus={() => setUSD(0)}
              label="Bolívares."
            />

            <Currency
              suffix="$  "
              value={usd}
              onChangeValue={setUSD}
              onFocus={() => setBs(0)}
              label="Dólares."
            />
          </Div>

          <Div
            style={{
              gap: 10,
              width: "100%",
              paddingVertical: 10,
              paddingHorizontal: 40,
              justifyContent: "center",
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
      </Div>
    </ScrollDiv>
  );
}
