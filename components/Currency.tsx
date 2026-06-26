import { TextInput, Text, View, Platform, type TextInputProps } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { Pressable, TouchableOpacity } from "react-native";
import { Copy } from "./icons/Copy";
import { useRef, useState, useCallback, useMemo } from "react";
import { setStringAsync, getStringAsync } from "expo-clipboard";
import { formatCurrency, formatNumber } from "@/utils/formatCurrency";
import { Tooltip } from "./Tooltip";
import { Paste } from "./icons/Paste";

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Convert a decimal value to its integer cents representation.
 *
 * @example toCents(23.50, 2) → 2350
 * @example toCents(1, 2) → 100
 */
function toCents(value: number | null, precision: number): number {
  if (value === null || isNaN(value)) return 0;
  return Math.round(Math.abs(value) * Math.pow(10, precision));
}

/**
 * Format a cents integer into a display string.
 *
 * @example formatCentsDisplay(2350, '.', ',', 2) → "23,50"
 * @example formatCentsDisplay(5, '.', ',', 2)    → "0,05"
 */
function formatCentsDisplay(
  cents: number,
  delimiter: string,
  separator: string,
  precision: number,
): string {
  const value = cents / Math.pow(10, precision);
  return formatNumber(value, { delimiter, separator, precision });
}

// ── Types ──────────────────────────────────────────────────────────────

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
}

// ── Component ──────────────────────────────────────────────────────────

/**
 * Cents-first currency input (right-to-left digit entry).
 *
 * Uses a hidden TextInput for keyboard capture and a visible Text overlay
 * for formatted display.  No flash, no stacking, instant formatting.
 *
 * Typing "2", "3", "5", "0" produces: 0,02 → 0,23 → 2,35 → 23,50
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
  ...props
}: CurrencyInputProps) {
  const [
    textColor,
    textSecondaryColor,
    bgColor,
    borderColor,
    iconColor,
    bgFocusColor,
    borderFocusColor,
  ] = useThemeColor(
    "text",
    "textSecondary",
    "backgroundSecondary",
    "border",
    "icon",
    "backgroundFocus",
    "borderFocus",
  );
  const [copied, setCopied] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ── Core state: integer cents ──
  const [rawCents, setRawCents] = useState(() => toCents(value, precision));

  // Track last value we emitted to detect external changes
  const lastEmittedValue = useRef(value);

  // Sync when value changes externally (rate change, other input recalc)
  if (value !== lastEmittedValue.current) {
    lastEmittedValue.current = value;
    const externalCents = toCents(value, precision);
    if (externalCents !== rawCents) {
      setRawCents(externalCents);
    }
  }

  // ── Derived display values ──
  const displayText = useMemo(
    () => formatCentsDisplay(rawCents, delimiter, separator, precision),
    [rawCents, delimiter, separator, precision],
  );

  // Hidden input value: raw digits string for keyboard capture
  const hiddenValue = rawCents.toString();

  // Memoize selection to avoid creating new objects on every render
  const selection = useMemo(
    () => ({ start: hiddenValue.length, end: hiddenValue.length }),
    [hiddenValue.length],
  );

  // ── Keyboard handler ──
  const handleChangeText = useCallback(
    (text: string) => {
      // Extract ONLY digits from whatever the platform gives us
      const digits = text.replace(/\D/g, "");
      const newCents = parseInt(digits, 10) || 0;

      // Clamp to max
      const numericValue = newCents / Math.pow(10, precision);
      if (numericValue > maxValue) return;
      if (numericValue < minValue) return;

      setRawCents(newCents);
      lastEmittedValue.current = numericValue;
      onChangeValue?.(numericValue);
    },
    [precision, maxValue, minValue, onChangeValue],
  );

  // ── Clipboard actions ──
  const copy = async () => {
    await setStringAsync(formatCurrency(value ?? 0, suffix));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const paste = async () => {
    const clipboardContent = await getStringAsync();
    const match = clipboardContent.match(/-?\d+(?:[.,]\d+)*(?:[.,]\d+)?/);

    if (match) {
      const numberString = match[0].replace(/\./g, "").replace(",", ".");
      const pastedValue = parseFloat(numberString);
      if (!isNaN(pastedValue)) {
        const pastedCents = toCents(pastedValue, precision);
        setRawCents(pastedCents);
        lastEmittedValue.current = pastedValue;
        onChangeValue?.(pastedValue);
      }
    }

    setTooltip(false);
  };

  return (
    <>
      <Div>
        {label && (
          <Typography style={{ paddingLeft: 5 }} type="md">
            {label}
          </Typography>
        )}

        <View style={{ position: "relative" }}>
          <TouchableOpacity
            onPress={() => inputRef.current?.focus()}
            onLongPress={() => setTooltip(true)}
            activeOpacity={0.7}
          >
            <View
              style={{ position: "relative" }}
              pointerEvents={Platform.OS === "web" ? "auto" : "none"}
            >
              {/* Suffix label (Bs / $) */}
              <Typography
                type="subtitle"
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 14,
                  top: 13,
                  zIndex: 99,
                  fontSize: 16,
                  color: textSecondaryColor,
                }}
              >
                {suffix}
              </Typography>

              {/* Hidden TextInput — captures keyboard, text invisible */}
              <TextInput
                {...props}
                ref={inputRef}
                value={hiddenValue}
                onChangeText={handleChangeText}
                selection={selection}
                keyboardType="number-pad"
                caretHidden={true}
                contextMenuHidden={Platform.OS === "web" ? false : true}
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
                    backgroundColor: isFocused ? bgFocusColor : bgColor,
                    fontSize: 16,
                    lineHeight: 32,
                    fontFamily: "Poppins_600SemiBold",
                    borderStyle: "solid",
                    borderWidth: 1,
                    borderColor: isFocused ? borderFocusColor : borderColor,
                    borderRadius: 10,
                    padding: 0,
                    paddingLeft: 40,
                    height: 50,
                    color: "transparent",
                  },
                  Platform.OS === "web"
                    ? ({ caretColor: "transparent" } as any)
                    : {},
                ]}
              />

              {/* Visible formatted text overlay — matches suffix position exactly */}
              <Text
                style={{
                  position: "absolute",
                  left: 40,
                  top: 13,
                  fontSize: 16,
                  fontFamily: "Poppins_600SemiBold",
                  color: textColor,
                }}
                pointerEvents="none"
              >
                {displayText}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Copy button */}
          <TouchableOpacity
            onPress={copy}
            style={{
              position: "absolute",
              right: 0,
              top: 2,
              bottom: 0,
              width: 40,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Copy
              width={20}
              height={20}
              color={copied ? iconColor : textSecondaryColor}
              check={copied}
            />
          </TouchableOpacity>

          {/* Paste tooltip */}
          <Tooltip
            open={tooltip}
            setOpen={setTooltip}
            style={{
              right: 40,
              top: -30,
              zIndex: 99,
            }}
          >
            <TouchableOpacity onPress={paste}>
              <Typography
                type="md"
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  color: textSecondaryColor,
                }}
              >
                <Paste
                  width={16}
                  height={16}
                  color={textSecondaryColor}
                  style={{ transform: [{ translateY: 3 }] }}
                />
                {"  "}
                Pegar
              </Typography>
            </TouchableOpacity>
          </Tooltip>
        </View>
      </Div>
    </>
  );
}

// ── Display-only component ─────────────────────────────────────────────

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
  const val = isNaN(value ?? 0) ? 0 : value ?? 0;
  const formattedValue = formatNumber(val, {
    suffix: " " + suffix,
    delimiter,
    separator,
    precision,
  });
  return <Typography type="subtitle">{formattedValue}</Typography>;
}
