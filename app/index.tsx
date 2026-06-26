import { useState, useEffect, useCallback } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { ScrollDiv } from "@/components/ScrollDiv";
import { Currency } from "@/components/Currency";
import { ConvertionDisplay } from "@/components/Convertions";
import { RateHistory } from "@/components/RateHistory";
import { BottomDrawer } from "@/components/BottomDrawer";
import { convertAmount } from "@/utils/calculateConvertions";
import { convertionStore } from "@/store/convertions";
import { Platform, RefreshControl, Modal, Pressable, View, useWindowDimensions, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { TrendingUp } from "@/components/icons/TrendingUp";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { ArrowDownUp } from "@/components/icons/ArrowDownUp";
import { Info } from "@/components/icons/Info";
import { X } from "@/components/icons/X";
import { getCaracasDate } from "@/utils/getCaracasDate";
import { Tag } from "@/components/Tag";

export default function Index() {
  const [
    iconColor,
    bgColor,
    textSecondaryColor,
    textPrimaryColor,
    borderColor,
    bgSecondaryColor,
  ] = useThemeColor(
    "icon",
    "background",
    "textSecondary",
    "text",
    "border",
    "backgroundSecondary"
  );
  const [bs, setBs] = useState<number | null>(0);
  const [usd, setUSD] = useState<number | null>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastEdited, setLastEdited] = useState<"bs" | "usd">("bs");
  const [notification, setNotification] = useState<"success" | "error" | "offline" | null>(
    null
  );
  const [isPolicyVisible, setIsPolicyVisible] = useState(false);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number>(0);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;
  
  const convertions = convertionStore((state) => state.convertions);
  
  const activeCurrency = convertions.find((c) => c.currency_id === selectedCurrencyId);
  const activeCurrencyName = activeCurrency ? activeCurrency.currency_name : "";

  const fetchConvertions = convertionStore((state) => state.fetchConvertions);
  const fetch = async () => {
    await fetchConvertions();
  };

  useEffect(() => {
    fetch();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch();
      setNotification("success");
    } catch (error: any) {
      if (__DEV__) {
        console.error("Error refreshing convertions:", error);
      }
      if (error.message === "No network connection") {
        setNotification("offline");
      } else {
        setNotification("error");
      }
    } finally {
      setRefreshing(false);
      setTimeout(() => {
        setNotification(null);
      }, 2000);
    }
  }, []);
  const [rate, setRate] = useState(0);
  useEffect(() => {
    if (convertions[0]) {
      const fechaCaracas = getCaracasDate();
      const fechaFija = getCaracasDate(convertions[0].date);
      if (fechaCaracas < fechaFija) {
        setRate(convertions[0].rate_old);
      } else {
        setRate(convertions[0].rate);
      }
      if (bs === 0 && usd === 0) {
        handleUsdChange(1);
      } else if (lastEdited === "bs") {
        handleBsChange(bs);
      } else {
        handleUsdChange(usd);
      }
    }
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
      style={{ backgroundColor: bgColor, position: "relative" }}
      contentContainerStyle={{ flexGrow: 1 }}
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
      <View
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          zIndex: 99,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
        }}
        pointerEvents="none"
      >
        {notification === "error" && (
          <Tag variant="error">Error al actualizar</Tag>
        )}
        {notification === "offline" && (
          <Tag variant="error">Sin conexión</Tag>
        )}
        {notification === "success" && <Tag variant="success">Actualizado</Tag>}
      </View>
      <Div
        style={[
          {
            width: "100%",
            flex: 1,
          },
          Platform.OS === "web" ? {
            height: "100dvh",
            justifyContent: "center",
            alignItems: "center",
          } as any : {},
        ]}
      >
        <Div
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            alignSelf: "center",
            maxWidth: 400,
          }}
        >
          {/* Left Block: Calculator Card */}
          <View style={{ width: "100%" }}>
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
              <ConvertionDisplay
                convertions={convertions}
                setRate={setRate}
                selectedId={selectedCurrencyId}
                setSelectedId={setSelectedCurrencyId}
              />
              {selectedCurrencyId > 0 && (
                <TouchableOpacity
                  onPress={() => setIsHistoryModalVisible(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: borderColor,
                    borderRadius: 10,
                    paddingVertical: 12,
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: bgSecondaryColor,
                    marginTop: 15,
                  }}
                >
                  <Typography type="defaultSemiBold" style={{ color: iconColor }}>
                    📊 Ver tendencia y fluctuación
                  </Typography>
                </TouchableOpacity>
              )}
            </Div>
          </View>
        </Div>
        <Div
          style={{
            width: "100%",
            paddingHorizontal: 40,
            paddingVertical: 30,
            marginTop: "auto",
            alignItems: "center",
          }}
        >
          <Pressable 
            onPress={() => setIsPolicyVisible(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: 0.5,
              padding: 10,
            }}
          >
            <Info width={14} height={14} color={textSecondaryColor} />
            <Typography
              type="md"
              style={{
                color: textSecondaryColor,
                fontSize: 12,
              }}
            >
              Aviso Legal y Privacidad
            </Typography>
          </Pressable>
        </Div>
      </Div>

      <BottomDrawer
        visible={isPolicyVisible}
        onClose={() => setIsPolicyVisible(false)}
        title="Términos y Privacidad"
      >
          <Typography type="subtitle" style={{ marginBottom: 10, fontSize: 16 }}>
            1. Descargo de Responsabilidad
          </Typography>
          <Typography type="md" style={{ color: textSecondaryColor, marginBottom: 24, fontSize: 14, lineHeight: 22 }}>
            Esta aplicación tiene un fin estricta y exclusivamente <Typography type="md" style={{ fontFamily: "Poppins_700Bold", color: textSecondaryColor, fontSize: 14 }}>INFORMATIVO</Typography>. 
            No fijamos, no influimos, no calculamos y no especulamos con las tasas de cambio mostradas. Toda la información proporcionada se recopila automáticamente de fuentes públicas y de terceros.
            {"\n\n"}
            No promovemos ni participamos en la compra, venta o intercambio de divisas, ni fomentamos la especulación financiera de ningún tipo. El uso que usted le dé a esta información es bajo su propio y exclusivo riesgo.
          </Typography>

          <Typography type="subtitle" style={{ marginBottom: 10, fontSize: 16 }}>
            2. Privacidad y Datos
          </Typography>
          <Typography type="md" style={{ color: textSecondaryColor, marginBottom: 40, fontSize: 14, lineHeight: 22 }}>
            La aplicación NO recopila, almacena, comparte ni transmite ningún tipo de información personal, financiera o de identificación del usuario. Funciona únicamente como un agregador de información pública.
          </Typography>
      </BottomDrawer>

      <BottomDrawer
        visible={isHistoryModalVisible}
        onClose={() => setIsHistoryModalVisible(false)}
        title="Tendencia de Tasa"
      >
          {selectedCurrencyId > 0 && (
            <RateHistory
              currencyId={selectedCurrencyId}
              currencyName={activeCurrencyName}
            />
          )}
      </BottomDrawer>
    </ScrollDiv>
  );
}
