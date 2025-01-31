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

export const Btn: React.FC<BtnProps> = ({ children, onPress, icon, style }) => {
  const iconColor = useThemeColor({}, "icon");
  const textColor = useThemeColor({}, "text");

  return (
    <Div style={{ alignItems: "baseline" }}>
      <TouchableOpacity
        onPress={onPress}
        style={[
          {
            borderStyle: "solid",
            borderWidth: 1,
            borderColor: icon ? iconColor : textColor,
            borderRadius: 5,
            padding: 5,
            paddingHorizontal: 10,
          },
          style,
        ]}
      >
        <Typography type="subtitle">
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

interface IconBtnProps extends TouchableOpacityProps {
  onPress: () => void;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  size?: number;
}

export const IconBtn: React.FC<IconBtnProps> = ({ icon, size, onPress }) => {
  const iconColor = useThemeColor({}, "icon");
  const sized: number = size || 18;

  return (
    <Div style={{ alignItems: "baseline" }}>
      <TouchableOpacity
        onPress={onPress}
        style={{
          padding: 8,
        }}
      >
        <MaterialCommunityIcons name={icon} size={sized} color={iconColor} />
      </TouchableOpacity>
    </Div>
  );
};
