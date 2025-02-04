import { Colors } from "./constants/Colors.ts";
export default {
  expo: {
    name: "Cambio rápido",
    slug: "conversion-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/favicon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/favicon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.ricardojparram.conversionapp",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            enableProguardInReleaseBuilds: true,
            extraProguardRules:
              "-keep class com.google.android.gms.internal.consent_sdk.** { *; }",
          },
        },
      ],
      ["expo-router"],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/favicon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: Colors.light.background,
          dark: {
            backgroundColor: Colors.dark.background,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "b433b60b-2287-429d-9ea7-8728a1cf27c5",
      },
    },
  },
};
