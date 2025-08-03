/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#d67d00";
const tintColorDark = "#eb8a02";

module.exports.Colors = {
  light: {
    text: "#25364b",
    textSecondary: "rgba(0, 0, 0, 0.5)",
    background: "#f9fafc",
    backgroundSecondary: "#ffffff",
    border: "rgba(0, 0, 0, 0.2)",
    tint: tintColorLight,
    icon: "#16a249",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#e6eff8",
    textSecondary: "rgba(255, 255, 255, 0.8)",
    background: "#0e151d",
    backgroundSecondary: "#1a2633",
    border: "rgba(255, 255, 255, 0.2)",
    tint: tintColorDark,
    icon: "#16a249",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};
