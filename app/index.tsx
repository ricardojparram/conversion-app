import { useState, useEffect } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { ScrollDiv } from "@/components/ScrollDiv";
import { Currency } from "@/components/Currency";
import { ConvertionDisplay } from "@/components/Convertions";
import { calculateConversions } from "@/utils/calculateConvertions";
import { convertionStore } from "@/store/convertions";
import { CalculatedConvertions } from "@/types/convertions";
import { Platform } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { TrendingUp } from "@/components/icons/TendringUp";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { ArrowDownUp } from "@/components/icons/ArrowDownUp";

const fuentesCambio = [
  { id: "bcv_usd", label: "BCV Dólar", value: 29.03, display: "Bs", span: 1 },
  { id: "bcv_eur", label: "BCV Euro", value: 39.42, display: "Bs", span: 1 },
  { id: "binance", label: "Binance P2P", value: 37.2, display: "Bs", span: 2 },
];

export default function Index() {
  const [iconColor, bgColor, textSecondaryColor] = useThemeColor(
    "icon",
    "background",
    "textSecondary"
  );
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

  useEffect(() => {
    fetch();
  }, []);
  const [selectedFuenteId, setSelectedFuenteId] = useState("bcv_usd"); // ID inicial

  return (
    <ScrollDiv style={{ backgroundColor: bgColor }}>
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
            paddingTop: 40,
            maxWidth: 400,
          }}
        >
          <Div
            style={{
              gap: 10,
              width: "100%",
              paddingVertical: 15,
              paddingHorizontal: 40,
            }}
          >
            <Div
              style={{
                width: "100%",
                marginBottom: 20,
              }}
            >
              <Div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginBottom: 5,
                }}
              >
                <TrendingUp width={24} height={24} color={iconColor} />
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
              </Div>
              <Div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  type="md"
                  style={{
                    textAlignVertical: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: textSecondaryColor,
                  }}
                >
                  Bolívares{" "}
                  <ArrowRight
                    width={16}
                    height={16}
                    color={textSecondaryColor}
                    style={{ transform: [{ translateY: 3 }] }}
                  />{" "}
                  Dólares
                </Typography>
              </Div>
            </Div>
            <Currency
              value={bs}
              onChangeValue={setBs}
              onFocus={() => setUSD(0)}
              label="Bolívares"
            />
            <ArrowDownUp
              width={20}
              height={20}
              color={iconColor}
              style={{ alignSelf: "center", marginTop: 10 }}
            />
            <Currency
              suffix="$"
              value={usd}
              onChangeValue={setUSD}
              onFocus={() => setBs(0)}
              label="Dólares"
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
            <ConvertionDisplay
              fuentes={fuentesCambio}
              selectedId={selectedFuenteId}
              onSelect={setSelectedFuenteId}
            />
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
