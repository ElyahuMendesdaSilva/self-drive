// src/app/_layout.js
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import IncomingShareUploader from "../components/IncomingShareUploader";
import { SessionProvider, useSession } from "../lib/session";
import { ThemeProvider, useColors } from "../lib/theme";

function RootStack() {
  const colors = useColors();
  const { ready } = useSession();
  if (!ready) return null; // espera ler a sessão salva (evita piscar a tela de login)
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(drawer)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <SessionProvider>
        <RootStack />
        <IncomingShareUploader />
      </SessionProvider>
    </ThemeProvider>
  );
}
