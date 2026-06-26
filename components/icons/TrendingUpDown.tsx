import Svg, { Path, G, Line } from "react-native-svg";

export function TrendingUpDown({
  width = "1em",
  height = "1em",
  color = "currentColor",
}: any) {
  return (
    <Svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 24 24"
    >
      <G
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <Path d="M14.828 14.828L21 21m0-5v5h-5m5-18l-9 9l-4-4l-6 6" />
        <Path d="M21 8V3h-5" />
      </G>
    </Svg>
  );
}
