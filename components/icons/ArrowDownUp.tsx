import Svg, { Path, Line } from "react-native-svg";

export function ArrowDownUp({
  width = "1em",
  height = "1em",
  color = "currentColor",
  ...rest
}: any) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...rest}>
      {/* Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE */}
      <Path
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="m21 16l-4 4l-4-4m4 4V4M3 8l4-4l4 4M7 4v16"
      />
    </Svg>
  );
}
