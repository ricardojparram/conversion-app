import { View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

export function Div({ style, ...rest }: ViewProps) {
  const [backgroundColor] = useThemeColor("background");

  return <View style={[{ backgroundColor }, style]} {...rest} />;
}
