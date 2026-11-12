import { Text, type TextProps, StyleSheet } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular",
  },
  medium: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium",
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_600SemiBold",
  },
  title: {
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.55,
    fontFamily: "Poppins_700Bold",
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_600SemiBold",
  },
  extraBold: {
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.7,
    fontFamily: "Poppins_800ExtraBold",
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.66,
    textTransform: "uppercase",
    fontFamily: "Poppins_700Bold",
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
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
  const [color] = useThemeColor("text");

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}
