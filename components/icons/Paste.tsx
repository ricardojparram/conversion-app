import Svg, { Path, G, Line } from "react-native-svg";

export function Paste({
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
        <Path d="M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1" />
        <Path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M16 4h2a2 2 0 0 1 2 2v2m-9 6h10" />
        <Path d="m17 10l4 4l-4 4" />
      </G>
    </Svg>
  );
}
