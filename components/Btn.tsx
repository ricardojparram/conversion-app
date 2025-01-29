import { TouchableOpacity } from "react-native";
import { Typography } from "./Typography";
import { useThemeColor } from "@/hooks/useThemeColor";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Div } from "./Div";
import { TouchableOpacityProps } from "react-native";

interface BtnProps extends TouchableOpacityProps {
  children: React.ReactNode;
  onPress: () => void;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}

export const Btn: React.FC<BtnProps> = ({ children, onPress, icon }) => {
  const iconColor = useThemeColor({}, "icon");
  const textColor = useThemeColor({}, "text");

  return (
    <Div style={{ alignItems: "baseline" }}>
      <TouchableOpacity
        onPress={onPress}
        style={{
          borderStyle: "solid",
          borderWidth: 1,
          borderColor: icon ? iconColor : textColor,
          borderRadius: 5,
          padding: 2,
          paddingHorizontal: 8,
        }}
      >
        <Typography>
          <Typography>{children}</Typography>
          {icon && " "}
          {icon && (
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
          )}
        </Typography>
      </TouchableOpacity>
    </Div>
  );
};
