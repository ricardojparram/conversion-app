import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Pressable,
  Text,
  View,
} from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { Convertion, Convertions } from "@/types/convertions";
import {
  formatNaturalCaracasDateTime,
  resolveEffectiveConvertion,
  shouldIncludeTimeForRate,
} from "@/utils/caracasTime";
import { formatCurrency } from "@/utils/formatCurrency";
import { CheckCircle } from "./icons/CheckCircle";
import { Refresh } from "./icons/Refresh";

interface ConvertionDisplayProps {
  convertions: Convertions;
  selectedId: number;
  onSelectSource: (currencyId: number) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  compact?: boolean;
}

export const ConvertionDisplay = ({
  convertions,
  selectedId,
  onSelectSource,
  onRefresh,
  refreshing = false,
  compact = false,
}: ConvertionDisplayProps) => {
  const isDark = (useColorScheme() ?? "light") === "dark";
  const [
    textColor,
    textSecondaryColor,
    surfaceColor,
    trayColor,
    primaryColor,
  ] = useThemeColor(
    "text",
    "textSecondary",
    "surface",
    "tray",
    "primary",
  );

  const [now, setNow] = useState<Date>(() => new Date());
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 15_000);

    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setNow(new Date());
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (refreshing) {
      spinAnim.setValue(0);
      spinLoopRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      spinLoopRef.current.start();
    } else {
      spinLoopRef.current?.stop();
      spinAnim.setValue(0);
    }

    return () => {
      spinLoopRef.current?.stop();
    };
  }, [refreshing, spinAnim]);

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const activeRow = useMemo(
    () =>
      convertions.find((c) => c.currency_id === selectedId) ??
      convertions[0] ??
      null,
    [convertions, selectedId],
  );

  const updatedLabel = useMemo(() => {
    if (!activeRow) return "Sin conexión";
    const { effectiveDate } = resolveEffectiveConvertion(activeRow, now);
    const includeTime = shouldIncludeTimeForRate({
      source: activeRow.source,
      effectiveDate,
    });
    return formatNaturalCaracasDateTime(effectiveDate, now, { includeTime });
  }, [activeRow, now]);

  const rows = useMemo(() => {
    const pairs: Convertion[][] = [];
    for (let i = 0; i < convertions.length; i += 2) {
      pairs.push(convertions.slice(i, i + 2));
    }
    return pairs;
  }, [convertions]);

  const cardShadowStyle = isDark
    ? {
        shadowOpacity: 0,
        elevation: 0,
      }
    : {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 2,
      };

  return (
    <View
      style={{
        paddingTop: compact ? 13 : 16,
        gap: compact ? 8 : 10,
      }}
    >
      {/* Header Row: "Fuentes" left | "Actualizado: ..." + refresh button right */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          rowGap: 4,
          columnGap: 8,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontFamily: "Poppins_500Medium",
            fontSize: 12,
            lineHeight: 16,
            color: textSecondaryColor,
          }}
        >
          Fuentes
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginLeft: "auto",
            flexShrink: 1,
          }}
        >
          <Text
            style={{
              fontFamily: "Poppins_500Medium",
              fontSize: 12,
              lineHeight: 16,
              color: textSecondaryColor,
              textAlign: "right",
              flexShrink: 1,
            }}
          >
            Actualizado: {updatedLabel}
          </Text>

          {onRefresh && (
            <Pressable
              onPress={onRefresh}
              disabled={refreshing}
              hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
              accessibilityRole="button"
              accessibilityLabel="Actualizar tasas"
              style={({ pressed }) => ({
                width: 26,
                height: 26,
                borderRadius: 999,
                borderWidth: 0,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  pressed || refreshing ? trayColor : "transparent",
              })}
            >
              <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
                <Refresh size={14} color={textSecondaryColor} />
              </Animated.View>
            </Pressable>
          )}
        </View>
      </View>

      {/* 2-Column Sources Grid (full-span odd last card) */}
      {rows.length > 0 && (
        <View style={{ gap: 10 }}>
          {rows.map((pair, rowIndex) => (
            <View
              key={rowIndex}
              style={{
                flexDirection: "row",
                gap: 10,
                alignItems: "stretch",
              }}
            >
              {pair.map((row) => {
                const isActive = row.currency_id === selectedId;
                const { effectiveRate } = resolveEffectiveConvertion(row, now);

                return (
                  <Pressable
                    key={row.currency_id}
                    onPress={() => onSelectSource(row.currency_id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${row.currency_name}: ${formatCurrency(effectiveRate, "Bs")}`}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: compact ? 72 : 78,
                      paddingVertical: compact ? 10 : 12,
                      paddingHorizontal: 14,
                      borderWidth: 0,
                      borderRadius: 16,
                      backgroundColor: isActive ? primaryColor : surfaceColor,
                      justifyContent: "space-between",
                      alignItems: "stretch",
                      gap: 6,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                      opacity: pressed && isActive ? 0.94 : 1,
                      ...cardShadowStyle,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                      }}
                    >
                      <Text
                        numberOfLines={2}
                        style={{
                          flexShrink: 1,
                          fontFamily: isActive
                            ? "Poppins_700Bold"
                            : "Poppins_600SemiBold",
                          fontSize: 12,
                          lineHeight: 15,
                          letterSpacing: -0.12,
                          color: isActive
                            ? "rgba(255, 255, 255, 0.94)"
                            : textSecondaryColor,
                        }}
                      >
                        {row.currency_name}
                      </Text>

                      {isActive && (
                        <CheckCircle size={17} checkColor={primaryColor} />
                      )}
                    </View>

                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={{
                        fontFamily: isActive
                          ? "Poppins_800ExtraBold"
                          : "Poppins_700Bold",
                        fontSize: 17,
                        lineHeight: 20,
                        letterSpacing: -0.35,
                        color: isActive ? "#ffffff" : textColor,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {formatCurrency(effectiveRate, "Bs")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
