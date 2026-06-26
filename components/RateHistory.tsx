import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Typography } from "@/components/Typography";
import { convertionStore } from "@/store/convertions";
import { formatCurrency } from "@/utils/formatCurrency";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatSimpleDate(dateStr: string): string {
  try {
    const [datePart] = dateStr.split("T");
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year.slice(-2)}`;
  } catch {
    return dateStr;
  }
}

interface RateHistoryProps {
  currencyId: number;
  currencyName: string;
}

export function RateHistory({ currencyId, currencyName }: RateHistoryProps) {
  const [
    textColor,
    textSecondaryColor,
    bgColor,
    borderColor,
    iconColor,
  ] = useThemeColor(
    "text",
    "textSecondary",
    "backgroundSecondary",
    "border",
    "icon"
  );

  const [days, setDays] = useState<7 | 15 | 30>(7);
  const [isExpanded, setIsExpanded] = useState(false);

  const rateHistory = convertionStore((state) => state.rateHistory);
  const isFetchingHistory = convertionStore((state) => state.isFetchingHistory);
  const fetchHistory = convertionStore((state) => state.fetchHistory);

  // Fetch history whenever active currency source or days range changes
  useEffect(() => {
    fetchHistory(currencyId, days);
  }, [currencyId, days, fetchHistory]);

  const historyData = useMemo(() => {
    return rateHistory[currencyId] || [];
  }, [rateHistory, currencyId]);

  // Calculations for metrics and SVG
  const { points, minRate, maxRate, changePercent, isPositive, chartD, fillD, lastPoint } = useMemo(() => {
    if (historyData.length === 0) {
      return {
        points: [],
        minRate: 0,
        maxRate: 0,
        changePercent: 0,
        isPositive: true,
        chartD: "",
        fillD: "",
        lastPoint: null,
      };
    }

    const rates = historyData.map((d) => d.rate);
    const maxVal = Math.max(...rates);
    const minVal = Math.min(...rates);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    // Map database rates into 300x150 SVG coordinates
    const mappedPoints = historyData.map((d, index) => {
      const x = historyData.length > 1 ? (index / (historyData.length - 1)) * 300 : 150;
      // 110 px chart height space, 20 px top/bottom margins
      const y = 150 - ((d.rate - minVal) / valRange) * 110 - 20;
      return { x, y, rate: d.rate, date: d.date };
    });

    const initialRate = rates[0];
    const latestRate = rates[rates.length - 1];
    const change = initialRate === 0 ? 0 : ((latestRate - initialRate) / initialRate) * 100;
    const pos = latestRate >= initialRate;

    // Build SVG paths
    const linePath = mappedPoints.length > 0
      ? "M " + mappedPoints.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")
      : "";

    const fillPath = linePath
      ? `${linePath} L ${mappedPoints[mappedPoints.length - 1].x.toFixed(1)} 150 L ${mappedPoints[0].x.toFixed(1)} 150 Z`
      : "";

    return {
      points: mappedPoints,
      minRate: minVal,
      maxRate: maxVal,
      changePercent: change,
      isPositive: pos,
      chartD: linePath,
      fillD: fillPath,
      lastPoint: mappedPoints[mappedPoints.length - 1] || null,
    };
  }, [historyData]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const trendColor = isPositive ? "#16a249" : "#ea4335";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Typography type="defaultSemiBold" style={{ color: textColor }}>
            Historial de Tasas
          </Typography>
          <Typography type="md" style={{ color: textSecondaryColor, marginTop: 2 }}>
            {currencyName} (Últimos {days} días)
          </Typography>
        </View>

        {/* Range Selectors */}
        <View style={[styles.tabs, { borderColor }]}>
          {([7, 15, 30] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setDays(r)}
              style={[
                styles.tab,
                days === r && { backgroundColor: iconColor },
              ]}
            >
              <Typography
                type="md"
                style={{
                  color: days === r ? "white" : textSecondaryColor,
                  fontFamily: "Poppins_600SemiBold",
                }}
              >
                {r}D
              </Typography>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Loading Indicator */}
      {isFetchingHistory && historyData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={iconColor} />
        </View>
      ) : historyData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Typography type="md" style={{ color: textSecondaryColor, textAlign: "center" }}>
            No hay datos de fluctuación disponibles.
          </Typography>
        </View>
      ) : (
        <>
          {/* Metrics summary row */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricBlock}>
              <Typography type="md" style={{ color: textSecondaryColor }}>
                Mínimo
              </Typography>
              <Typography type="defaultSemiBold" style={{ color: textColor, marginTop: 2 }}>
                {formatCurrency(minRate, "Bs")}
              </Typography>
            </View>
            <View style={styles.metricBlock}>
              <Typography type="md" style={{ color: textSecondaryColor }}>
                Máximo
              </Typography>
              <Typography type="defaultSemiBold" style={{ color: textColor, marginTop: 2 }}>
                {formatCurrency(maxRate, "Bs")}
              </Typography>
            </View>
            <View style={[styles.metricBlock, { alignItems: "flex-end" }]}>
              <Typography type="md" style={{ color: textSecondaryColor }}>
                Variación
              </Typography>
              <Text
                style={[
                  styles.changeText,
                  { color: trendColor, fontFamily: "Poppins_600SemiBold" },
                ]}
              >
                {isPositive ? "▲" : "▼"} {changePercent.toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* SVG Line Chart Canvas */}
          <View style={styles.chartWrapper}>
            <Svg viewBox="0 0 300 150" width="100%" height={150}>
              <Defs>
                <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={trendColor} stopOpacity="0.25" />
                  <Stop offset="100%" stopColor={trendColor} stopOpacity="0.00" />
                </LinearGradient>
              </Defs>

              {/* Gradient area */}
              {fillD ? <Path d={fillD} fill="url(#chartGradient)" /> : null}

              {/* Stroke line */}
              {chartD ? (
                <Path
                  d={chartD}
                  fill="none"
                  stroke={trendColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {/* Pulsing indicator on the last coordinate point */}
              {lastPoint ? (
                <>
                  <Circle
                    cx={lastPoint.x.toFixed(1)}
                    cy={lastPoint.y.toFixed(1)}
                    r="8"
                    fill={trendColor}
                    opacity="0.15"
                  />
                  <Circle
                    cx={lastPoint.x.toFixed(1)}
                    cy={lastPoint.y.toFixed(1)}
                    r="4"
                    fill={trendColor}
                  />
                </>
              ) : null}
            </Svg>
          </View>

          {/* Collapsible history list toggler */}
          <TouchableOpacity
            onPress={toggleExpand}
            style={[styles.collapseHeader, { borderTopColor: borderColor }]}
          >
            <Typography
              type="md"
              style={{ color: iconColor, fontFamily: "Poppins_600SemiBold" }}
            >
              {isExpanded ? "Ocultar historial detallado" : "Ver historial detallado"}
            </Typography>
            <Typography
              type="md"
              style={{ color: iconColor, transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}
            >
              ▼
            </Typography>
          </TouchableOpacity>

          {/* Collapsible list content */}
          {isExpanded && (
            <View style={styles.listContainer}>
              {historyData
                .slice()
                .reverse()
                .map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.listItem,
                      { borderBottomColor: borderColor },
                      idx === historyData.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Typography type="md" style={{ color: textColor }}>
                      {formatSimpleDate(item.date)}
                    </Typography>
                    <Typography
                      type="defaultSemiBold"
                      style={{ color: iconColor }}
                    >
                      {formatCurrency(item.rate, "Bs")}
                    </Typography>
                  </View>
                ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metricBlock: {
    flex: 1,
  },
  changeText: {
    fontSize: 14,
    marginTop: 2,
  },
  chartWrapper: {
    height: 150,
    width: "100%",
    marginBottom: 10,
  },
  collapseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 10,
  },
  listContainer: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});
