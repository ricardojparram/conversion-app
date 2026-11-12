import Svg, { Circle, Path } from "react-native-svg";

interface CheckCircleProps {
  size?: number;
  checkColor?: string;
}

export function CheckCircle({
  size = 17,
  checkColor = "#16a249",
}: CheckCircleProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#ffffff" />
      <Path
        d="m8.5 12.2 2.3 2.3 4.7-4.8"
        fill="none"
        stroke={checkColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
