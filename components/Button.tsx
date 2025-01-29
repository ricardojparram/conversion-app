import { TouchableOpacity } from "react-native";
import { Typography } from "./Typography";
export const Btn = ({ children, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Typography>{children}</Typography>
    </TouchableOpacity>
  );
};
