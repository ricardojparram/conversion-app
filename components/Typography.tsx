import { Text, type TextProps, StyleSheet } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular",
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_600SemiBold",
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_600SemiBold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
    fontFamily: "Poppins_400Regular",
  },
  lg: {
    fontSize: 20,
    fontFamily: "Poppins_400Regular",
  },
  md: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },
  sm: {
    fontSize: 8,
    fontFamily: "Poppins_400Regular",
  },
});

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: keyof typeof styles;
};

export function Typography({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}
