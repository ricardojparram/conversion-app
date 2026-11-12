import type { ViewProps } from "react-native";
import { View } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Typography } from "./Typography";

export const Tag = ({
  variant = "default",
  children,
  style,
  ...props
}: ViewProps & { variant?: "default" | "success" | "error" }) => {
  const isDark = (useColorScheme() ?? "light") === "dark";
  const [textSecondaryColor, surfaceColor, primaryColor, dangerColor] =
    useThemeColor("textSecondary", "surface", "primary", "danger");

  const variants = {
    default: {
      backgroundColor: surfaceColor,
      textColor: textSecondaryColor,
    },
    success: {
      backgroundColor: primaryColor,
      textColor: "#ffffff",
    },
    error: {
      backgroundColor: dangerColor,
      textColor: "#ffffff",
    },
  };

  return (
    <View
      style={[
        {
          paddingHorizontal: 18,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 0,
          backgroundColor: variants[variant].backgroundColor,
          ...(isDark
            ? {
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
                elevation: 8,
              }
            : {
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.18,
                shadowRadius: 20,
                elevation: 8,
              }),
        },
        style,
      ]}
      {...props}
    >
      <Typography
        type="defaultSemiBold"
        style={{
          color: variants[variant].textColor,
          fontSize: 14,
          lineHeight: 20,
          textAlign: "center",
        }}
      >
        {children}
      </Typography>
    </View>
  );
};
