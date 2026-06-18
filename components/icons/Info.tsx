import * as React from "react";
import Svg, { SvgProps, Path, Circle } from "react-native-svg";

export const Info = (props: SvgProps) => (
  <Svg
    width={props.width || 24}
    height={props.height || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.color || "currentColor"}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Circle cx={12} cy={12} r={10} />
    <Path d="M12 16v-4" />
    <Path d="M12 8h.01" />
  </Svg>
);
