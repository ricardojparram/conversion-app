import Svg, { Path, G, Line } from "react-native-svg";

export function TrendingUp({
  width = "1em",
  height = "1em",
  color = "currentColor",
}: any) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24">
      {/* Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE */}
      <G
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <Path d="m22 7l-8.5 8.5l-5-5L2 17" />
        <Path d="M16 7h6v6" />
      </G>
    </Svg>
  );
}
