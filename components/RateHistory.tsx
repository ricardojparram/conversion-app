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
  useWindowDimensions,
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

function getSourceColor(name: string): string {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("bcv")) return "#16a249";       // Green
  if (lowercase.includes("paralelo")) return "#ea4335";  // Red
  return "#2563eb"; // Blue for Promedio / others
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
    bgFocusColor,
  ] = useThemeColor(
    "text",
    "textSecondary",
    "backgroundSecondary",
    "border",
    "icon",
    "backgroundFocus"
  );

  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && screenWidth >= 768;

  const [days, setDays] = useState<7 | 15 | 30>(7);
  const [isExpanded, setIsExpanded] = useState(false);

  // Read available currency sources and history store
  const convertions = convertionStore((state) => state.convertions);
  const rateHistory = convertionStore((state) => state.rateHistory);
  const isFetchingHistory = convertionStore((state) => state.isFetchingHistory);
  const fetchHistory = convertionStore((state) => state.fetchHistory);

  // Local state for comparing multiple sources
  const [selectedSources, setSelectedSources] = useState<number[]>([currencyId]);

  // Sync selected sources with the primary currency when prop changes
  useEffect(() => {
    setSelectedSources([currencyId]);
  }, [currencyId]);

  // Fetch history for all selected sources
  useEffect(() => {
    selectedSources.forEach((id) => {
      fetchHistory(id, days);
    });
  }, [selectedSources, days, fetchHistory]);

  const toggleSource = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedSources.includes(id)) {
      if (selectedSources.length > 1) {
        setSelectedSources(selectedSources.filter((s) => s !== id));
      }
    } else {
      setSelectedSources([...selectedSources, id]);
    }
  };

  // Compile coordinates and paths for all selected sources
  const { charts, globalMin, globalMax } = useMemo(() => {
    let allRates: number[] = [];
    const selectedHistories = selectedSources.map((id) => ({
      id,
      data: rateHistory[id] || [],
      meta: convertions.find((c) => c.currency_id === id),
    }));

    selectedHistories.forEach((sh) => {
      allRates.push(...sh.data.map((d) => d.rate));
    });

    if (allRates.length === 0) {
      return { charts: [], globalMin: 0, globalMax: 0 };
    }

    const minVal = Math.min(...allRates);
    const maxVal = Math.max(...allRates);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const mappedCharts = selectedHistories.map((sh) => {
      const mappedPoints = sh.data.map((d, index) => {
        const x = sh.data.length > 1 ? 6 + (index / (sh.data.length - 1)) * 288 : 150;
        // 110 px chart height space, 20 px padding
        const y = 150 - ((d.rate - minVal) / valRange) * 110 - 20;
        return { x, y, rate: d.rate, date: d.date };
      });

      const linePath = mappedPoints.length > 0
        ? "M " + mappedPoints.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")
        : "";

      const fillPath = linePath
        ? `${linePath} L ${mappedPoints[mappedPoints.length - 1].x.toFixed(1)} 150 L ${mappedPoints[0].x.toFixed(1)} 150 Z`
        : "";

      return {
        id: sh.id,
        currencyName: sh.meta ? sh.meta.currency_name : "Tasa",
        color: getSourceColor(sh.meta ? sh.meta.currency_name : ""),
        points: mappedPoints,
        chartD: linePath,
        fillD: fillPath,
        lastPoint: mappedPoints[mappedPoints.length - 1] || null,
      };
    });

    return { charts: mappedCharts, globalMin: minVal, globalMax: maxVal };
  }, [selectedSources, rateHistory, convertions]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  // Determine single-mode variables
  const isSingleMode = selectedSources.length === 1;
  const singleChart = charts[0];
  const singleHistory = singleChart ? (rateHistory[singleChart.id] || []) : [];
  const singleChangePercent = useMemo(() => {
    if (!singleChart || singleHistory.length === 0) return 0;
    const rates = singleHistory.map((h) => h.rate);
    const initial = rates[0] || 0;
    const latest = rates[rates.length - 1] || 0;
    return initial === 0 ? 0 : ((latest - initial) / initial) * 100;
  }, [singleChart, singleHistory]);
  
  const isSinglePositive = singleChart ? (singleChart.lastPoint ? (singleChart.lastPoint.rate >= (singleHistory[0]?.rate || 0)) : true) : true;
  const singleTrendColor = isSinglePositive ? "#16a249" : "#ea4335";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Typography type="defaultSemiBold" style={{ color: textColor, fontSize: 16 }}>
          {isSingleMode && singleChart ? singleChart.currencyName.replace("Dólar ", "") : "Comparar"}
        </Typography>

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
                  fontSize: 12,
                }}
              >
                {r}D
              </Typography>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Source Selector (Filters Grid) */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {convertions.map((row) => {
            const isSelected = selectedSources.includes(row.currency_id);
            const sourceColor = getSourceColor(row.currency_name);
            return (
              <TouchableOpacity
                key={row.currency_id}
                onPress={() => toggleSource(row.currency_id)}
                style={[
                  styles.sourceFilter,
                  {
                    borderColor: isSelected ? sourceColor : borderColor,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: sourceColor,
                    marginRight: 6,
                    opacity: isSelected ? 1 : 0.3,
                  }}
                />
                <Typography
                  type="defaultSemiBold"
                  style={{
                    color: isSelected ? textColor : textSecondaryColor,
                    fontSize: 12,
                  }}
                >
                  {row.currency_name.replace("Dólar ", "")}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Loading Indicator */}
      {isFetchingHistory && charts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={iconColor} />
        </View>
      ) : charts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Typography type="md" style={{ color: textSecondaryColor, textAlign: "center" }}>
            No hay datos de fluctuación disponibles.
          </Typography>
        </View>
      ) : (
        <>
          {/* Single Mode Metrics */}
          {isSingleMode && singleChart && (
            <View style={styles.metricsContainer}>
              <View style={styles.metricBlock}>
                <Typography type="md" style={{ color: textSecondaryColor }}>
                  Mínimo
                </Typography>
                <Typography type="defaultSemiBold" style={{ color: textColor, marginTop: 2 }}>
                  {formatCurrency(globalMin, "Bs")}
                </Typography>
              </View>
              <View style={styles.metricBlock}>
                <Typography type="md" style={{ color: textSecondaryColor }}>
                  Máximo
                </Typography>
                <Typography type="defaultSemiBold" style={{ color: textColor, marginTop: 2 }}>
                  {formatCurrency(globalMax, "Bs")}
                </Typography>
              </View>
              <View style={[styles.metricBlock, { alignItems: "flex-end" }]}>
                <Typography type="md" style={{ color: textSecondaryColor }}>
                  Variación
                </Typography>
                <Text
                  style={[
                    styles.changeText,
                    { color: singleTrendColor, fontFamily: "Poppins_600SemiBold" },
                  ]}
                >
                  {isSinglePositive ? "▲" : "▼"} {singleChangePercent.toFixed(2)}%
                </Text>
              </View>
            </View>
          )}

          {/* SVG Line Chart Canvas */}
          <View style={styles.chartWrapper}>
            <Svg viewBox="0 0 300 150" width="100%" height={150}>
              <Defs>
                {charts.map((c) => (
                  <LinearGradient key={`grad-${c.id}`} id={`grad-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={c.color} stopOpacity="0.20" />
                    <Stop offset="100%" stopColor={c.color} stopOpacity="0.00" />
                  </LinearGradient>
                ))}
              </Defs>

              {/* Gradient area underlays */}
              {charts.map((c) =>
                c.fillD ? (
                  <Path
                    key={`fill-${c.id}`}
                    d={c.fillD}
                    fill={`url(#grad-${c.id})`}
                  />
                ) : null
              )}

              {/* Stroke lines */}
              {charts.map((c) =>
                c.chartD ? (
                  <Path
                    key={`stroke-${c.id}`}
                    d={c.chartD}
                    fill="none"
                    stroke={c.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null
              )}

              {/* Pulsing indicator on the last coordinate point */}
              {charts.map((c) =>
                c.lastPoint ? (
                  <React.Fragment key={`indicator-${c.id}`}>
                    <Circle
                      cx={c.lastPoint.x.toFixed(1)}
                      cy={c.lastPoint.y.toFixed(1)}
                      r="8"
                      fill={c.color}
                      opacity="0.15"
                    />
                    <Circle
                      cx={c.lastPoint.x.toFixed(1)}
                      cy={c.lastPoint.y.toFixed(1)}
                      r="4"
                      fill={c.color}
                    />
                  </React.Fragment>
                ) : null
              )}
            </Svg>
          </View>

          {/* Multi-mode Comparison Summary Table */}
          {!isSingleMode && (
            <View style={{ marginTop: 12, marginBottom: 10, gap: 10 }}>
              {charts.map((c) => {
                const history = rateHistory[c.id] || [];
                const rates = history.map((h) => h.rate);
                const initial = rates[0] || 0;
                const latest = rates[rates.length - 1] || 0;
                const change = initial === 0 ? 0 : ((latest - initial) / initial) * 100;
                const isPos = latest >= initial;
                const trendCol = isPos ? "#16a249" : "#ea4335";

                return (
                  <View
                    key={`compare-${c.id}`}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: borderColor,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1.5 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color, marginRight: 8 }} />
                      <Typography type="defaultSemiBold" style={{ fontSize: 13, color: textColor }}>
                        {c.currencyName.replace("Dólar ", "")}
                      </Typography>
                    </View>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Typography type="md" style={{ color: textSecondaryColor, fontSize: 11 }}>
                        Mín / Máx
                      </Typography>
                      <Typography type="md" style={{ color: textColor, fontSize: 11, marginTop: 2 }}>
                        {formatCurrency(Math.min(...rates) || 0, "Bs")} - {formatCurrency(Math.max(...rates) || 0, "Bs")}
                      </Typography>
                    </View>
                    <View style={{ flex: 1.2, alignItems: "flex-end" }}>
                      <Typography type="defaultSemiBold" style={{ color: textColor, fontSize: 13 }}>
                        {formatCurrency(latest, "Bs")}
                      </Typography>
                      <Text style={{ color: trendCol, fontSize: 11, fontFamily: "Poppins_600SemiBold", marginTop: 2 }}>
                        {isPos ? "▲" : "▼"} {change.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Collapsible history list toggler (Single Mode Only) */}
          {isSingleMode && singleChart && (
            <>
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
                  {singleHistory
                    .slice()
                    .reverse()
                    .map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.listItem,
                          { borderBottomColor: borderColor },
                          idx === singleHistory.length - 1 && { borderBottomWidth: 0 },
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
  sourceFilter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "transparent",
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
