import CurrencyInput, {
  type CurrencyInputProps,
  formatNumber,
} from "react-native-currency-input";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";

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
  const [textColor, bgColor] = useThemeColor("text", "backgroundSecondary");

  return (
    <Div>
      {label && (
        <Typography style={{ paddingLeft: 5 }} type="md">
          {label}
        </Typography>
      )}

      <CurrencyInput
        value={value}
        onChangeValue={onChangeValue}
        suffix={"  " + suffix}
        delimiter={delimiter}
        separator={separator}
        precision={precision}
        minValue={0}
        maxValue={9999999999999}
        onChangeText={onChangeText}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          fontSize: 20,
          textAlign: "right",
          borderStyle: "solid",
          borderWidth: 1,
          borderColor: "rgba(0, 0, 0, 0.2)",
          borderRadius: 10,
          paddingRight: 10,
          height: 50,
        }}
        onPress={onPress}
        {...props}
      />
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
  const val = isNaN(value) ? 0 : value;
  const formattedValue = formatNumber(val, {
    suffix: " " + suffix,
    delimiter,
    separator,
    precision,
  });
  return <Typography type="subtitle">{formattedValue}</Typography>;
}
