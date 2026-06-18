import * as React from "react";
import Svg, { SvgProps, Path } from "react-native-svg";

export const X = (props: SvgProps) => (
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
    <Path d="M18 6L6 18" />
    <Path d="M6 6l12 12" />
  </Svg>
);
