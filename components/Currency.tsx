import CurrencyInput, {
  type CurrencyInputProps,
  formatNumber,
} from "react-native-currency-input";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { Pressable, Touchable, TouchableOpacity } from "react-native";
import { Copy } from "./icons/Copy";
import { useRef } from "react";

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
  const [textColor, textSecondaryColor, bgColor, borderColor] = useThemeColor(
    "text",
    "textSecondary",
    "backgroundSecondary",
    "border"
  );
  const inputRef = useRef<CurrencyInput>(null);

  return (
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
          onLongPress={() => console.log("long")}
        >
          <Div style={{ position: "relative" }} pointerEvents="none">
            <Typography
              type="subtitle"
              style={{
                position: "absolute",
                left: 14,
                top: 14,
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
          onPress={() => console.log("press")}
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
          <Copy width={20} height={20} color={textSecondaryColor} />
        </TouchableOpacity>
      </Div>
    </Div>
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
