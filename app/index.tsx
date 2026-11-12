import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import * as Network from "expo-network";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BottomDrawer } from "@/components/BottomDrawer";
import { ConvertionDisplay } from "@/components/Convertions";
import { Currency } from "@/components/Currency";
import { Tag } from "@/components/Tag";
import { Typography } from "@/components/Typography";
import { ArrowDownUp } from "@/components/icons/ArrowDownUp";
import { BrandLogo } from "@/components/icons/BrandLogo";
import { Info } from "@/components/icons/Info";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { convertionStore } from "@/store/convertions";
import { convertAmount } from "@/utils/calculateConvertions";
import {
  getForeignCurrencyMeta,
  resolveEffectiveConvertion,
} from "@/utils/caracasTime";

function HomeScreen() {
  const isDark = (useColorScheme() ?? "light") === "dark";
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isCompact = windowHeight < 720;

  const [
    bgColor,
    surfaceColor,
    textColor,
    textSecondaryColor,
    textMutedColor,
    primaryColor,
    amberBgColor,
    tintColor,
  ] = useThemeColor(
    "background",
    "surface",
    "text",
    "textSecondary",
    "textMuted",
    "primary",
    "amberBg",
    "tint",
  );

  const convertions = convertionStore((state) => state.convertions);
  const fetchConvertions = convertionStore((state) => state.fetchConvertions);

  const [bs, setBs] = useState<number | null>(0);
  const [foreign, setForeign] = useState<number | null>(0);
  const [lastEdited, setLastEdited] = useState<"bs" | "foreign">("foreign");
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number>(0);
  const [isSwapped, setIsSwapped] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [notification, setNotification] = useState<
    "success" | "error" | "offline" | null
  >(null);
  const [isPolicyVisible, setIsPolicyVisible] = useState(false);
  const [cardHeights, setCardHeights] = useState({
    foreign: isCompact ? 88 : 94,
    bs: isCompact ? 88 : 94,
  });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const restViewportHeightRef = useRef(0);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await fetchConvertions();
      } catch {
        // Offline-first fallback already hydrated from SQLite/localStorage
      } finally {
        if (active) {
          setHasLoadedOnce(true);
        }
      }
    })();
    return () => {
      active = false;
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [fetchConvertions]);

  const showToast = useCallback((type: "success" | "error" | "offline") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setNotification(type);
    toastTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 2000);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      try {
        const netState = await Network.getNetworkStateAsync();
        if (
          netState.isConnected === false ||
          netState.isInternetReachable === false
        ) {
          showToast("offline");
          return;
        }
      } catch {
        // Continue to attempt fetch if network probe is unavailable
      }

      await fetchConvertions();
      showToast("success");
    } catch (error: unknown) {
      if (__DEV__) {
        console.error("Error refreshing convertions:", error);
      }
      const message = error instanceof Error ? error.message : "";
      let isOffline =
        message === "No network connection" ||
        /network request failed|failed to fetch|offline/i.test(message);

      if (!isOffline) {
        try {
          const netState = await Network.getNetworkStateAsync();
          if (
            netState.isConnected === false ||
            netState.isInternetReachable === false
          ) {
            isOffline = true;
          }
        } catch {
          // Keep error classification
        }
      }

      showToast(isOffline ? "offline" : "error");
    } finally {
      setRefreshing(false);
    }
  }, [fetchConvertions, showToast]);

  // Keep selectedCurrencyId valid when convertions arrive
  useEffect(() => {
    if (convertions.length === 0) return;
    const exists = convertions.some(
      (c) => c.currency_id === selectedCurrencyId,
    );
    if (!exists) {
      setSelectedCurrencyId(convertions[0].currency_id);
    }
  }, [convertions, selectedCurrencyId]);

  const activeConvertion = useMemo(
    () =>
      convertions.find((c) => c.currency_id === selectedCurrencyId) ??
      convertions[0] ??
      null,
    [convertions, selectedCurrencyId],
  );

  const activeRate = useMemo(() => {
    if (!activeConvertion) return 0;
    return resolveEffectiveConvertion(activeConvertion).effectiveRate;
  }, [activeConvertion]);

  const { suffix, targetLabel } = useMemo(
    () => getForeignCurrencyMeta(activeConvertion),
    [activeConvertion],
  );

  const calcSnapshotRef = useRef({ bs, foreign, lastEdited });
  calcSnapshotRef.current = { bs, foreign, lastEdited };

  // Recalculate opposite amount whenever activeRate or selected source changes
  useEffect(() => {
    if (activeRate <= 0) return;

    const {
      bs: currentBs,
      foreign: currentForeign,
      lastEdited: currentLastEdited,
    } = calcSnapshotRef.current;

    if ((currentBs ?? 0) === 0 && (currentForeign ?? 0) === 0) {
      setLastEdited("foreign");
      setForeign(1);
      setBs(convertAmount(1, activeRate, "usdToBs"));
      return;
    }

    if (currentLastEdited === "bs") {
      setForeign(convertAmount(currentBs || 0, activeRate, "bsToUsd"));
    } else {
      setBs(convertAmount(currentForeign || 0, activeRate, "usdToBs"));
    }
  }, [activeRate, selectedCurrencyId]);

  const handleBsChange = useCallback(
    (newBs: number | null) => {
      setLastEdited("bs");
      if (newBs === null) {
        setBs(null);
        setForeign(null);
        return;
      }
      setBs(newBs);
      setForeign(convertAmount(newBs, activeRate, "bsToUsd"));
    },
    [activeRate],
  );

  const handleForeignChange = useCallback(
    (newForeign: number | null) => {
      setLastEdited("foreign");
      if (newForeign === null) {
        setBs(null);
        setForeign(null);
        return;
      }
      setForeign(newForeign);
      setBs(convertAmount(newForeign, activeRate, "usdToBs"));
    },
    [activeRate],
  );

  const resetInputs = useCallback(() => {
    setBs(0);
    setForeign(0);
  }, []);

  const handleSwap = useCallback(() => {
    const nextSwapped = !isSwapped;
    setIsSwapped(nextSwapped);
    Animated.timing(swapRotateAnim, {
      toValue: nextSwapped ? 1 : 0,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [isSwapped, swapRotateAnim]);

  const swapRotate = swapRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const swapShadowStyle = isDark
    ? {
        shadowColor: "transparent",
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 6,
      }
    : {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 6,
      };

  const showOfflineBanner = hasLoadedOnce && convertions.length === 0;
  const topCardHeight = isSwapped ? cardHeights.bs : cardHeights.foreign;
  const topPadding = isCompact ? 48 : 68;
  const bottomPadding = isCompact ? 6 : 10;
  const activeViewportHeight = scrollViewportHeight || restViewportHeightRef.current;
  const osShrink =
    restViewportHeightRef.current > 0
      ? Math.max(0, restViewportHeightRef.current - activeViewportHeight)
      : 0;
  const extraKeyboardPadding =
    keyboardHeight > 0
      ? Math.max(0, keyboardHeight - insets.bottom - osShrink + 12)
      : 0;
  const stageMinHeight =
    restViewportHeightRef.current > 0
      ? Math.max(0, restViewportHeightRef.current - topPadding - bottomPadding)
      : undefined;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{
        flex: 1,
        backgroundColor: bgColor,
        position: "relative",
      }}
    >
      {/* Floating Toast Pill */}
      {notification !== null && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: Math.max(insets.top + 8, 16),
            left: 0,
            right: 0,
            zIndex: 99,
            flexDirection: "row",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          {notification === "success" && (
            <Tag variant="success">Actualizado</Tag>
          )}
          {notification === "offline" && (
            <Tag variant="error">Sin conexión</Tag>
          )}
          {notification === "error" && (
            <Tag variant="error">Error al actualizar</Tag>
          )}
        </View>
      )}

      {/* Single-Screen Upper-Aligned Calculator + Native Pull-to-Refresh */}
      <ScrollView
        style={{ flex: 1 }}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          setScrollViewportHeight(height);
          if (keyboardHeight === 0 && height > 0) {
            restViewportHeightRef.current = height;
          }
        }}
        contentContainerStyle={{
          flexGrow: 1,
          width: "100%",
          maxWidth: 440,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
        }}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressBackgroundColor={surfaceColor}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
      >
        <View
          style={{
            flexGrow: 1,
            minHeight: stageMinHeight,
            justifyContent: "space-between",
          }}
        >
          {/* Main Hero Upper Stage */}
          <View style={{ width: "100%" }}>
            {/* Header Block */}
            <View
              style={{
                alignItems: "center",
                marginBottom: isCompact ? 10 : 14,
              }}
            >
              <View style={{ marginBottom: isCompact ? 6 : 8 }}>
                <BrandLogo size={46} />
              </View>

              <Text
                style={{
                  fontFamily: "Poppins_700Bold",
                  fontSize: isCompact ? 21 : 23,
                  lineHeight: isCompact ? 26 : 28,
                  letterSpacing: -0.55,
                  color: textColor,
                  textAlign: "center",
                }}
              >
                Cambio rápido
              </Text>

              <Text
                style={{
                  marginTop: 3,
                  fontFamily: "Poppins_500Medium",
                  fontSize: 13,
                  lineHeight: 18,
                  color: textSecondaryColor,
                  textAlign: "center",
                }}
              >
                {isSwapped
                  ? `Bolívares → ${targetLabel}`
                  : `${targetLabel} → Bolívares`}
              </Text>
            </View>

            {/* Offline Empty-Cache Banner */}
            {showOfflineBanner && (
              <View
                style={{
                  marginBottom: 12,
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 0,
                  backgroundColor: amberBgColor,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    fontSize: 13,
                    lineHeight: 18,
                    color: tintColor,
                    textAlign: "center",
                  }}
                >
                  Mostrando modo sin conexión. Conéctate e intenta actualizar
                  las tasas.
                </Text>
              </View>
            )}

            {/* Stacked Inputs + Always-On-Top Circular Swap Overlay */}
            <View style={{ position: "relative" }}>
              <View
                style={{
                  flexDirection: isSwapped ? "column-reverse" : "column",
                  gap: 16,
                  zIndex: 1,
                  elevation: 0,
                }}
              >
                <View
                  key="foreign"
                  onLayout={(event) => {
                    const height = event.nativeEvent.layout.height;
                    setCardHeights((prev) =>
                      prev.foreign === height ? prev : { ...prev, foreign: height },
                    );
                  }}
                >
                  <Currency
                    label={targetLabel}
                    suffix={suffix}
                    value={foreign}
                    onChangeValue={handleForeignChange}
                    onFocus={resetInputs}
                    compact={isCompact}
                  />
                </View>

                <View
                  key="bs"
                  onLayout={(event) => {
                    const height = event.nativeEvent.layout.height;
                    setCardHeights((prev) =>
                      prev.bs === height ? prev : { ...prev, bs: height },
                    );
                  }}
                >
                  <Currency
                    label="Bolívares"
                    suffix="Bs"
                    value={bs}
                    onChangeValue={handleBsChange}
                    onFocus={resetInputs}
                    compact={isCompact}
                  />
                </View>
              </View>

              <Pressable
                onPress={handleSwap}
                accessibilityRole="button"
                accessibilityLabel="Invertir orden de monedas"
                accessibilityState={{ selected: isSwapped }}
                style={({ pressed }) => ({
                  position: "absolute",
                  top: topCardHeight - 14,
                  alignSelf: "center",
                  zIndex: 30,
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  borderWidth: 0,
                  backgroundColor: primaryColor,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  opacity: pressed ? 0.92 : 1,
                  ...swapShadowStyle,
                })}
              >
                <Animated.View style={{ transform: [{ rotate: swapRotate }] }}>
                  <ArrowDownUp width={20} height={20} color="#ffffff" />
                </Animated.View>
              </Pressable>
            </View>

            {/* Sources Section */}
            <ConvertionDisplay
              convertions={convertions}
              selectedId={selectedCurrencyId}
              onSelectSource={setSelectedCurrencyId}
              onRefresh={onRefresh}
              refreshing={refreshing}
              compact={isCompact}
            />
          </View>

          {/* Discreet Legal & Privacy Trigger */}
          <View
            style={{
              alignItems: "center",
              paddingTop: 14,
              paddingBottom: isCompact ? 2 : 4,
            }}
          >
            <Pressable
              onPress={() => setIsPolicyVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Aviso Legal y Privacidad"
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                opacity: pressed ? 0.95 : 0.65,
              })}
            >
              <Info width={13} height={13} color={textMutedColor} />
              <Text
                style={{
                  fontFamily: "Poppins_500Medium",
                  fontSize: 12,
                  lineHeight: 16,
                  color: textMutedColor,
                }}
              >
                Aviso Legal y Privacidad
              </Text>
            </Pressable>
          </View>
        </View>

        {extraKeyboardPadding > 0 && (
          <View style={{ height: extraKeyboardPadding }} />
        )}
      </ScrollView>

      {/* Legal & Privacy Drawer */}
      <BottomDrawer
        visible={isPolicyVisible}
        onClose={() => setIsPolicyVisible(false)}
        title="Términos y Privacidad"
      >
        <Typography
          type="subtitle"
          style={{ marginBottom: 10, fontSize: 16, color: textColor }}
        >
          1. Descargo de Responsabilidad
        </Typography>
        <Typography
          type="md"
          style={{
            color: textSecondaryColor,
            marginBottom: 24,
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          Esta aplicación tiene un fin estricta y exclusivamente{" "}
          <Typography
            type="md"
            style={{
              fontFamily: "Poppins_700Bold",
              color: textColor,
              fontSize: 14,
            }}
          >
            INFORMATIVO
          </Typography>
          . No fijamos, no influimos, no calculamos y no especulamos con las
          tasas de cambio mostradas. Toda la información proporcionada se
          recopila automáticamente de fuentes públicas y de terceros.
          {"\n\n"}
          No promovemos ni participamos en la compra, venta o intercambio de
          divisas, ni fomentamos la especulación financiera de ningún tipo. El
          uso que usted le dé a esta información es bajo su propio y exclusivo
          riesgo.
        </Typography>

        <Typography
          type="subtitle"
          style={{ marginBottom: 10, fontSize: 16, color: textColor }}
        >
          2. Privacidad y Datos
        </Typography>
        <Typography
          type="md"
          style={{
            color: textSecondaryColor,
            marginBottom: 40,
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          La aplicación NO recopila, almacena, comparte ni transmite ningún tipo
          de información personal, financiera o de identificación del usuario.
          Funciona únicamente como un agregador de información pública.
        </Typography>
      </BottomDrawer>
    </SafeAreaView>
  );
}

export default function Index() {
  return (
    <SafeAreaProvider>
      <HomeScreen />
    </SafeAreaProvider>
  );
}
