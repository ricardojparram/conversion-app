import Svg, { Rect, Path } from "react-native-svg";

interface BrandLogoProps {
  size?: number;
}

export function BrandLogo({ size = 46 }: BrandLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <Rect width={44} height={44} rx={12} fill="#16a249" />
      <Path
        d="M 33 16.5 L 23.65 25.85 L 18.15 20.35 L 11 27.5"
        fill="none"
        stroke="#095625"
        strokeWidth={3.025}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 26.4 16.5 L 33 16.5 L 33 23.1"
        fill="none"
        stroke="#095625"
        strokeWidth={3.025}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
