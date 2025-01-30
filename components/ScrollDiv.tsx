import { ScrollView, type ScrollViewProps, StatusBar } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedScrollViewProps = ScrollViewProps & {
  lightColor?: string;
  darkColor?: string;
};
export function ScrollDiv({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedScrollViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background",
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView style={[{ backgroundColor }, style]} {...otherProps} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
