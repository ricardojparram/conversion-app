import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { getStringAsync, setStringAsync } from "expo-clipboard";
import { Typography } from "@/components/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { parseClipboardAmount } from "@/utils/caracasTime";
import { formatCurrency, formatNumber } from "@/utils/formatCurrency";
import { Tooltip } from "./Tooltip";
import { Copy } from "./icons/Copy";
import { Paste } from "./icons/Paste";

function toCents(value: number | null, precision: number): number {
  if (value === null || isNaN(value)) return 0;
  return Math.round(Math.abs(value) * Math.pow(10, precision));
}

function formatCentsDisplay(
  cents: number,
  delimiter: string,
  separator: string,
  precision: number,
): string {
  const value = cents / Math.pow(10, precision);
  return formatNumber(value, { delimiter, separator, precision });
}

interface CurrencyInputProps
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  value: number | null;
  onChangeValue?: (value: number | null) => void;
  suffix?: string;
  delimiter?: string;
  separator?: string;
  precision?: number;
  label?: string;
  minValue?: number;
  maxValue?: number;
  compact?: boolean;
}

/**
 * Cents-first currency input (right-to-left digit entry) styled with
 * HeroUI Ultra-Flat borderless cards matching web CalculatorCard.
 */
export function Currency({
  value,
  onChangeValue,
  suffix = "Bs",
  delimiter = ".",
  separator = ",",
  precision = 2,
  label,
  minValue = 0,
  maxValue = 999999999999,
  compact = false,
  ...props
}: CurrencyInputProps) {
  const isDark = (useColorScheme() ?? "light") === "dark";
  const [
    textColor,
    textSecondaryColor,
    textMutedColor,
    surfaceColor,
    surfaceHoverColor,
    trayInnerColor,
    primaryColor,
    primaryInkColor,
    dangerColor,
  ] = useThemeColor(
    "text",
    "textSecondary",
    "textMuted",
    "surface",
    "surfaceHover",
    "trayInner",
    "primary",
    "primaryInk",
    "danger",
  );

  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [tooltip, setTooltip] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTipAnim = useRef(new Animated.Value(0)).current;

  const [rawCents, setRawCents] = useState(() => toCents(value, precision));
  const lastEmittedValue = useRef(value);

  if (value !== lastEmittedValue.current) {
    lastEmittedValue.current = value;
    const externalCents = toCents(value, precision);
    if (externalCents !== rawCents) {
      setRawCents(externalCents);
    }
  }

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const displayText = useMemo(
    () => formatCentsDisplay(rawCents, delimiter, separator, precision),
    [rawCents, delimiter, separator, precision],
  );

  const hiddenValue = rawCents.toString();

  const selection = useMemo(
    () => ({ start: hiddenValue.length, end: hiddenValue.length }),
    [hiddenValue.length],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, "");
      const newCents = parseInt(digits, 10) || 0;

      const numericValue = newCents / Math.pow(10, precision);
      if (numericValue > maxValue) return;
      if (numericValue < minValue) return;

      setRawCents(newCents);
      lastEmittedValue.current = numericValue;
      onChangeValue?.(numericValue);
    },
    [precision, maxValue, minValue, onChangeValue],
  );

  const triggerCopyFeedback = (status: "copied" | "error") => {
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    setCopyStatus(status);
    copyTipAnim.setValue(0);
    Animated.timing(copyTipAnim, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start();

    copyTimerRef.current = setTimeout(() => {
      setCopyStatus("idle");
      copyTipAnim.setValue(0);
    }, 1500);
  };

  const copy = async () => {
    try {
      const displayedNumeric = rawCents / Math.pow(10, precision);
      await setStringAsync(formatCurrency(displayedNumeric, suffix));
      triggerCopyFeedback("copied");
    } catch {
      triggerCopyFeedback("error");
    }
  };

  const paste = async () => {
    try {
      const clipboardContent = await getStringAsync();
      const pastedValue = parseClipboardAmount(clipboardContent);
      if (pastedValue !== null && pastedValue <= maxValue && pastedValue >= minValue) {
        const pastedCents = toCents(pastedValue, precision);
        setRawCents(pastedCents);
        lastEmittedValue.current = pastedValue;
        onChangeValue?.(pastedValue);
      }
    } finally {
      setTooltip(false);
    }
  };

  const cardPaddingV = compact ? 12 : 14;
  const cardPaddingH = 17;
  const isRaised = tooltip || copyStatus !== "idle";

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

  const tipTranslateY = copyTipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 0],
  });

  return (
    <View
      style={{
        position: "relative",
        zIndex: isRaised ? 15 : 1,
      }}
    >
      <Pressable
        onPress={() => inputRef.current?.focus()}
        onLongPress={() => setTooltip(true)}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`Editar monto en ${label ?? suffix}`}
        style={{
          position: "relative",
          backgroundColor: isFocused ? surfaceHoverColor : surfaceColor,
          borderWidth: 0,
          borderRadius: 16,
          paddingVertical: cardPaddingV,
          paddingHorizontal: cardPaddingH,
          ...cardShadowStyle,
        }}
      >
        {/* Top Row: Label (left) + spacer for floating Copy pill (right) */}
        <View
          style={{
            minHeight: 34,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingRight: 96,
          }}
        >
          {label ? (
            <Typography
              type="label"
              numberOfLines={1}
              style={{ color: textMutedColor }}
            >
              {label}
            </Typography>
          ) : null}
        </View>

        {/* Value Row: Prefix + Tabular Big Amount */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: 6,
            marginTop: 2,
          }}
          pointerEvents="none"
        >
          <Text
            style={{
              fontFamily: "Poppins_700Bold",
              fontSize: 18,
              lineHeight: 22,
              color: textSecondaryColor,
            }}
          >
            {suffix}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{
              flexShrink: 1,
              fontFamily: "Poppins_800ExtraBold",
              fontSize: compact ? 26 : 29,
              lineHeight: compact ? 31 : 34,
              letterSpacing: -0.7,
              color: textColor,
              fontVariant: ["tabular-nums"],
            }}
          >
            {displayText}
          </Text>
        </View>

        {/* Hidden TextInput for keyboard capture */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          pointerEvents={Platform.OS === "web" ? "auto" : "none"}
        >
          <TextInput
            {...props}
            ref={inputRef}
            value={hiddenValue}
            onChangeText={handleChangeText}
            selection={selection}
            keyboardType="number-pad"
            caretHidden={true}
            contextMenuHidden={Platform.OS !== "web"}
            autoCorrect={false}
            autoComplete="off"
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0,
                fontSize: 16,
              },
              Platform.OS === "web"
                ? ({ caretColor: "transparent" } as any)
                : {},
            ]}
          />
        </View>
      </Pressable>

      {/* Copy Pill Button + Floating Feedback Tooltip (independent of card press) */}
      <View
        style={{
          position: "absolute",
          top: cardPaddingV,
          right: cardPaddingH,
          zIndex: 10,
          alignItems: "flex-end",
        }}
      >
        {copyStatus !== "idle" && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: "100%",
              marginBottom: 6,
              right: 0,
              zIndex: 25,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor:
                copyStatus === "error" ? dangerColor : primaryColor,
              opacity: copyTipAnim,
              transform: [{ translateY: tipTranslateY }],
              shadowColor: isDark ? "#000000" : "#0f172a",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.5 : 0.18,
              shadowRadius: 14,
              elevation: 8,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 12,
                lineHeight: 15,
                color: "#ffffff",
              }}
            >
              {copyStatus === "error" ? "No se pudo copiar" : "¡Copiado!"}
            </Text>
          </Animated.View>
        )}

        <Pressable
          onPress={copy}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Copiar monto en ${label ?? suffix}`}
          style={({ pressed }) => ({
            minHeight: 34,
            paddingHorizontal: 11,
            paddingVertical: 7,
            borderRadius: 12,
            borderWidth: 0,
            backgroundColor: trayInnerColor,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transform: [{ scale: pressed ? 0.95 : 1 }],
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Copy
            width={15}
            height={15}
            color={copyStatus === "copied" ? primaryInkColor : textSecondaryColor}
            check={copyStatus === "copied"}
          />
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 12,
              lineHeight: 15,
              color:
                copyStatus === "copied" ? primaryInkColor : textSecondaryColor,
            }}
          >
            Copiar
          </Text>
        </Pressable>
      </View>

      {/* Long-Press Paste Tooltip */}
      <Tooltip
        open={tooltip}
        setOpen={setTooltip}
        style={{
          left: 16,
          top: -40,
        }}
      >
        <Pressable
          onPress={paste}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minHeight: 30,
            paddingHorizontal: 2,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Paste width={16} height={16} color={textSecondaryColor} />
          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 13,
              lineHeight: 18,
              color: textSecondaryColor,
            }}
          >
            Pegar
          </Text>
        </Pressable>
      </Tooltip>
    </View>
  );
}

export function TextCurrency({
  value = 0,
  suffix = "Bs.",
  delimiter = ".",
  separator = ",",
  precision = 2,
}: {
  value?: number | null;
  suffix?: string;
  delimiter?: string;
  separator?: string;
  precision?: number;
}) {
  const val = isNaN(value ?? 0) ? 0 : (value ?? 0);
  const formattedValue = formatNumber(val, {
    suffix: " " + suffix,
    delimiter,
    separator,
    precision,
  });
  return <Typography type="subtitle">{formattedValue}</Typography>;
}
