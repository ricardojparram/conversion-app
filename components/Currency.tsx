import CurrencyInput, {
  type CurrencyInputProps,
  formatNumber,
} from "react-native-currency-input";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import {
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Copy } from "./icons/Copy";
import { useRef, useState, useEffect } from "react";
import { setStringAsync, getStringAsync } from "expo-clipboard";
import { formatCurrency } from "@/utils/formatCurrency";
import { Tooltip } from "./Tooltip";
import { Btn } from "./Btn";
import { Paste } from "./icons/Paste";
import { Dimensions } from "react-native";

interface CurrencyInputType extends CurrencyInputProps {
  label?: string;
}

export function Currency({
  value,
  onChangeValue,
  suffix = "Bs",
  delimiter = ".",
  separator = ",",
  precision = 2,
  label,
  onChangeText,
  onPress,
  ...props
}: CurrencyInputType) {
  const [textColor, textSecondaryColor, bgColor, borderColor, iconColor] =
    useThemeColor(
      "text",
      "textSecondary",
      "backgroundSecondary",
      "border",
      "icon"
    );
  const [copied, setCopied] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const inputRef = useRef<CurrencyInput>(null);

  const copy = async () => {
    await setStringAsync(formatCurrency(value ?? 0, suffix));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const paste = async () => {
    const clipboardContent = await getStringAsync();
    const match = clipboardContent.match(/-?\d+(?:[.,]\d+)*(?:[.,]\d+)?/);

    if (match) {
      let numberString = match[0].replace(/\./g, "").replace(",", ".");
      const value = parseFloat(numberString);
      onChangeValue?.(value);
    }

    setTooltip(false);
  };

  const closeTooltip = () => {
    setTooltip(false);
  };

  return (
    <>
      {/* Overlay invisible que cierra el tooltip al tocar fuera */}

      <Div>
        {label && (
          <Typography style={{ paddingLeft: 5 }} type="md">
            {label}
          </Typography>
        )}

        <Div
          style={{
            position: "relative",
          }}
        >
          <Pressable
            onPress={() => inputRef.current?.focus()}
            onLongPress={() => setTooltip(true)}
          >
            <Div style={{ position: "relative" }} pointerEvents="none">
              <Typography
                type="subtitle"
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
              <CurrencyInput
                ref={inputRef}
                value={value}
                onChangeValue={onChangeValue}
                delimiter={delimiter}
                separator={separator}
                precision={precision}
                minValue={0}
                maxValue={9999999999999999999}
                onChangeText={onChangeText}
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  fontSize: 16,
                  lineHeight: 32,
                  fontFamily: "Poppins_600SemiBold",
                  borderStyle: "solid",
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 10,
                  padding: 0,
                  paddingLeft: 40,
                  height: 50,
                }}
                onPress={onPress}
                {...props}
              />
            </Div>
          </Pressable>

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

          <Tooltip
            open={tooltip}
            setOpen={setTooltip}
            style={{
              right: 40,
              top: -30,
              zIndex: 99, // Asegura que esté por encima del overlay
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
        </Div>
      </Div>
    </>
  );
}

export function TextCurrency({
  value = 0,
  suffix = "Bs.",
  delimiter = ".",
  separator = ",",
  precision = 2,
}: CurrencyInputProps) {
  const val = isNaN(value ?? 0) ? 0 : value ?? 0;
  const formattedValue = formatNumber(val, {
    suffix: " " + suffix,
    delimiter,
    separator,
    precision,
  });
  return <Typography type="subtitle">{formattedValue}</Typography>;
}
