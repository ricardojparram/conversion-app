import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";

import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const [backgroundColor] = useThemeColor("background");
  return (
    <ThemeProvider value={DarkTheme}>
      <View style={{ flex: 1, backgroundColor }}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="inverted" />
        {Platform.OS === "web" && (
          <Head>
            <title>Cambio rápido</title>
          </Head>
        )}
      </View>
    </ThemeProvider>
  );
}
