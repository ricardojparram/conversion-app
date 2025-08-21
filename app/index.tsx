import { useState, useEffect, useCallback } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { ScrollDiv } from "@/components/ScrollDiv";
import { Currency } from "@/components/Currency";
import { ConvertionDisplay } from "@/components/Convertions";
import { convertAmount } from "@/utils/calculateConvertions";
import { convertionStore } from "@/store/convertions";
import { Platform, RefreshControl } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { TrendingUp } from "@/components/icons/TendringUp";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { ArrowDownUp } from "@/components/icons/ArrowDownUp";
import { getCaracasDate } from "@/utils/getCaracasDate";

export default function Index() {
  const [iconColor, bgColor, textSecondaryColor, textPrimaryColor] =
    useThemeColor("icon", "background", "textSecondary", "text");
  const [bs, setBs] = useState<number | null>(0);
  const [usd, setUSD] = useState<number | null>(0);
  const [isFetching, setIsFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastEdited, setLastEdited] = useState<"bs" | "usd">("bs");
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
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, []);
  const [rate, setRate] = useState(0);
  useEffect(() => {
    const fechaCaracas = getCaracasDate();
    const fechaFija = getCaracasDate(convertions[0].date);
    if (fechaCaracas < fechaFija) {
      setRate(convertions[0].rate_old);
    } else {
      setRate(convertions[0].rate);
    }
    handleUsdChange(1);
  }, [convertions]);

  useEffect(() => {
    if (bs === 0 && usd === 0 && rate !== 0) {
      handleUsdChange(1);
      return;
    }
    if (lastEdited === "bs") {
      const newUsd = convertAmount(bs || 0, rate, "bsToUsd");
      setUSD(newUsd);
    } else {
      const newBs = convertAmount(usd || 0, rate, "usdToBs");
      setBs(newBs);
    }
  }, [rate]);

  const handleBsChange = (newBs: number | null) => {
    setLastEdited("bs");
    if (newBs === null) {
      setBs(null);
      setUSD(null);
      return;
    }
    if (newBs !== bs) {
      setBs(newBs);
      const newUsd = convertAmount(newBs, rate, "bsToUsd");
      setUSD(newUsd);
    }
  };

  const handleUsdChange = (newUsd: number | null) => {
    setLastEdited("usd");
    if (newUsd === null) {
      setBs(null);
      setUSD(null);
      return;
    }
    if (newUsd !== usd) {
      setUSD(newUsd);
      const newBs = convertAmount(newUsd, rate, "usdToBs");
      setBs(newBs);
    }
  };
  const resetInputs = () => {
    setBs(0);
    setUSD(0);
  };

  return (
    <ScrollDiv
      style={{ backgroundColor: bgColor }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          title="Actualizando..."
          progressBackgroundColor={"#e6eff8"}
          colors={[iconColor]}
        />
      }
    >
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
              onChangeValue={handleBsChange}
              onFocus={resetInputs}
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
              onChangeValue={handleUsdChange}
              onFocus={resetInputs}
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
            <ConvertionDisplay convertions={convertions} setRate={setRate} />
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
