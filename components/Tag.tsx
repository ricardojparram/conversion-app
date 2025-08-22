import { ViewProps } from "react-native-svg/lib/typescript/fabric/utils";
import { Div } from "./Div";
import { StyleSheet, Text } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Typography } from "./Typography";

export const Tag = ({
  variant = "default",
  children,
  style,
  ...props
}: ViewProps & { variant?: "default" | "success" | "error" }) => {
  const [textSecondaryColor, bgColor, borderColor, iconColor] = useThemeColor(
    "textSecondary",
    "backgroundSecondary",
    "border",
    "icon"
  );
  const variants = {
    default: {
      backgroundColor: bgColor,
      borderColor: borderColor,
      textColor: textSecondaryColor,
    },
    success: {
      backgroundColor: iconColor,
      borderColor: "green",
      textColor: "white",
    },
    error: {
      backgroundColor: "#e00000",
      borderColor: "#a00000",
      textColor: "white",
    },
  };
  return (
    <Div
      className={`tag tag-${variant}`}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        boxShadow: "1px 4px 10px rgba(0, 0, 0, 0.2)",
        ...variants[variant],
        ...(typeof style === "object" && style !== null ? style : {}),
      }}
      {...props}
    >
      <Typography
        type="defaultSemiBold"
        style={{ color: variants[variant].textColor }}
      >
        {children}
      </Typography>
    </Div>
  );
};
