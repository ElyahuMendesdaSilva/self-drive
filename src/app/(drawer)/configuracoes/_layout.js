// src/app/(drawer)/configuracoes/_layout.js — pilha das telas de configurações (lista → tópico).
import { Stack } from "expo-router";

import { SettingsProvider } from "../../../lib/settingsStore";
import { useColors } from "../../../lib/theme";

export default function ConfiguracoesLayout() {
  const colors = useColors();
  return (
    <SettingsProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </SettingsProvider>
  );
}
