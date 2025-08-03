import Svg, { Path, G, Rect, Line } from "react-native-svg";

export function Copy({
  width = 16,
  height = 16,
  color = "currentColor",
  ...rest
}: any) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" {...rest}>
      {/* Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE */}
      <G
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <Rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <Path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </G>
    </Svg>
  );
}
