import Svg, { Path, Line } from "react-native-svg";

export function ArrowRight({
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
        d="M5 12h14m-7-7l7 7l-7 7"
      />
    </Svg>
  );
}
