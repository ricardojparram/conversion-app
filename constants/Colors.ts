/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#9a5000";
const tintColorDark = "#fcd34d";

export const Colors = {
  light: {
    text: "#182334",
    textSecondary: "#475569",
    textMuted: "#64748b",
    background: "#e8edf4",
    backgroundSecondary: "#ffffff",
    backgroundFocus: "#e7eef6",
    surface: "#ffffff",
    surfaceHover: "#e7eef6",
    tray: "#dce3ec",
    trayHover: "#d2dce8",
    trayInner: "#e4eaf2",
    border: "rgba(15, 23, 42, 0.12)",
    borderFocus: "rgba(15, 23, 42, 0.24)",
    tint: tintColorLight,
    amberBg: "rgba(245, 158, 11, 0.15)",
    primary: "#16a249",
    primaryInk: "#037c2f",
    brandStroke: "#095625",
    danger: "#ea4335",
    icon: "#16a249",
    tabIconDefault: "#64748b",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    background: "#080f17",
    backgroundSecondary: "#0c1b29",
    backgroundFocus: "#0f2336",
    surface: "#0c1b29",
    surfaceHover: "#0f2336",
    tray: "#0e2133",
    trayHover: "#142c44",
    trayInner: "#080f17",
    border: "rgba(255, 255, 255, 0.12)",
    borderFocus: "rgba(255, 255, 255, 0.24)",
    tint: tintColorDark,
    amberBg: "rgba(245, 158, 11, 0.14)",
    primary: "#16a249",
    primaryInk: "#34d399",
    brandStroke: "#095625",
    danger: "#ea4335",
    icon: "#16a249",
    tabIconDefault: "#94a3b8",
    tabIconSelected: tintColorDark,
  },
};
