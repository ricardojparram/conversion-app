/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#d67d00";
const tintColorDark = "#eb8a02";

module.exports.Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    backgroundSecondary: "#202224",
    tint: tintColorLight,
    icon: "#14334d",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    backgroundSecondary: "#202224",
    tint: tintColorDark,
    icon: "#e3f1fc",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};
