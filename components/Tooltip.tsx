import { useThemeColor } from "@/hooks/useThemeColor";
import { Div } from "./Div";
import { Typography } from "./Typography";
import { useState } from "react";
import { Dimensions, TouchableWithoutFeedback } from "react-native";

export const Tooltip = ({
  children,
  open,
  setOpen,
  style,
}: {
  children: any;
  open: boolean;
  setOpen: (open: boolean) => void;
  style?: any;
}) => {
  const [bgColor, borderColor] = useThemeColor("backgroundSecondary", "border");

  return (
    <>
      {open && (
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <Div
            style={{
              position: "absolute",
              top: -500,
              left: -500,
              right: 200,
              bottom: 200,
              height: 5000,
              width: 5000,
              zIndex: 98,
              backgroundColor: "transparent",
            }}
          />
        </TouchableWithoutFeedback>
      )}
      <Div
        style={{
          position: "absolute",
          display: open ? "block" : "none",
          backgroundColor: bgColor,
          borderStyle: "solid",
          borderWidth: 1,
          borderColor: borderColor,
          borderRadius: 10,
          paddingHorizontal: 15,
          paddingVertical: 5,
          boxShadow: "1px 4px 10px rgba(0, 0, 0, 0.1)",
          zIndex: 1000,
          ...style,
        }}
      >
        {children}
      </Div>
    </>
  );
};
