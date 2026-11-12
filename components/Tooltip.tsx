import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export const Tooltip = ({
  children,
  open,
  setOpen,
  style,
}: {
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const isDark = (useColorScheme() ?? "light") === "dark";
  const [trayColor] = useThemeColor("tray");

  if (!open) {
    return null;
  }

  return (
    <>
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <View
          style={{
            position: "absolute",
            top: -1000,
            left: -1000,
            height: 3000,
            width: 3000,
            zIndex: 98,
            backgroundColor: "transparent",
          }}
        />
      </TouchableWithoutFeedback>
      <View
        style={[
          {
            position: "absolute",
            backgroundColor: trayColor,
            borderWidth: 0,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 6,
            zIndex: 1000,
            ...(isDark
              ? {
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.55,
                  shadowRadius: 20,
                  elevation: 10,
                }
              : {
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.18,
                  shadowRadius: 20,
                  elevation: 10,
                }),
          },
          style,
        ]}
      >
        {children}
      </View>
    </>
  );
};
