// src/lib/theme.js — tema único do app (Material 3), com esquemas claro e escuro.
//
// Uso nos componentes:
//   const colors = useColors();                 // papéis M3 do esquema atual
//   const styles = useStyles(createStyles);     // StyleSheet criado a partir das cores (com cache)
//   const { scheme, preference, setPreference } = useTheme();
//
// A preferência do usuário ("system" | "light" | "dark") fica salva no SecureStore.
// No Android os papéis são calculados a partir do `seedColor`; iOS e web usam os
// mesmos papéis em valores fixos (as paletas abaixo).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";

import { secureGet, secureSet } from "./storage";

export const seedColor = "#8ab4f8";

const STORAGE_KEY = "theme_preference";
export const THEME_PREFERENCES = ["system", "light", "dark"];
export const DEFAULT_PREFERENCE = "system";

/* ---------- paletas (fallback para iOS/web e para papéis que o Android não calcula) ---------- */

const darkPalette = {
  // superfícies
  background: "#131314",
  onBackground: "#e3e3e3",
  surfaceDim: "#131314",
  surface: "#1e1f20",
  surfaceBright: "#37393b",
  surfaceContainerLowest: "#0e0e0f",
  surfaceContainerLow: "#1b1c1d",
  surfaceContainer: "#282a2c",
  surfaceContainerHigh: "#303134",
  surfaceContainerHighest: "#3c4043",
  surfaceVariant: "#444746",
  onSurface: "#e3e3e3",
  onSurfaceVariant: "#c4c7c5",
  outline: "#8e918f",
  outlineVariant: "#444746",
  // primary
  primary: "#8ab4f8",
  onPrimary: "#062e6f",
  primaryContainer: "#004a77",
  onPrimaryContainer: "#c2e7ff",
  // secondary
  secondary: "#c4c7c5",
  onSecondary: "#2d3130",
  secondaryContainer: "#444746",
  onSecondaryContainer: "#e3e3e3",
  // tertiary
  tertiary: "#c58af9",
  onTertiary: "#3a1363",
  tertiaryContainer: "#52277f",
  onTertiaryContainer: "#efdcff",
  // error
  error: "#f2b8b5",
  onError: "#601410",
  errorContainer: "#601410",
  onErrorContainer: "#f9dedc",
  // inverso e utilitários
  inverseSurface: "#e3e3e3",
  inverseOnSurface: "#303134",
  inversePrimary: "#0b57d0",
  surfaceTint: "#8ab4f8",
  scrim: "#000000",
  shadow: "#000000",
  // extensão fora do M3 (aviso/atenção)
  warning: "#fdd663",
};

const lightPalette = {
  // superfícies (do mais "baixo" para o mais "alto": branco → cinza-azulado)
  background: "#ffffff",
  onBackground: "#1f1f1f",
  surfaceDim: "#d3dbe5",
  surface: "#f8fafd",
  surfaceBright: "#ffffff",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f3f6fc",
  surfaceContainer: "#f0f4f9",
  surfaceContainerHigh: "#e9eef6",
  surfaceContainerHighest: "#dde3ea",
  surfaceVariant: "#e1e3e1",
  onSurface: "#1f1f1f",
  onSurfaceVariant: "#444746",
  outline: "#747775",
  outlineVariant: "#c4c7c5",
  // primary
  primary: "#0b57d0",
  onPrimary: "#ffffff",
  primaryContainer: "#d3e3fd",
  onPrimaryContainer: "#041e49",
  // secondary
  secondary: "#444746",
  onSecondary: "#ffffff",
  secondaryContainer: "#dde3ea",
  onSecondaryContainer: "#1f1f1f",
  // tertiary
  tertiary: "#8430ce",
  onTertiary: "#ffffff",
  tertiaryContainer: "#f2daff",
  onTertiaryContainer: "#2c0a52",
  // error
  error: "#b3261e",
  onError: "#ffffff",
  errorContainer: "#f9dedc",
  onErrorContainer: "#410e0b",
  // inverso e utilitários
  inverseSurface: "#303134",
  inverseOnSurface: "#f2f2f2",
  inversePrimary: "#a8c7fa",
  surfaceTint: "#0b57d0",
  scrim: "#000000",
  shadow: "#000000",
  // extensão fora do M3 (aviso/atenção) — âmbar escuro para dar contraste no claro
  warning: "#9c5700",
};

const withAlpha = (color, alpha) => {
  const rgb = color.replace("#", "").slice(0, 6);
  return `#${rgb}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
};

function buildColors(scheme) {
  const base = scheme === "dark" ? darkPalette : lightPalette;
  let palette = base;

  if (Platform.OS === "android") {
    try {
      const { getMaterialColors } = require("@expo/ui/jetpack-compose");
      palette = { ...base, ...getMaterialColors({ seedColor, scheme }) };
    } catch {
      // Mantém a paleta Material 3 fixa se as cores nativas não estiverem disponíveis.
    }
  }

  return {
    ...palette,
    // camada de toque (state layer) sobre o primary
    pressed: withAlpha(palette.primary, 0.12),
    // véu atrás de diálogos, menus e drawer
    scrim: withAlpha(palette.scrim ?? "#000000", scheme === "dark" ? 0.6 : 0.4),
    // fundo preto puro dos visualizadores de mídia em tela cheia (igual nos dois esquemas)
    media: "#000000",
  };
}

const palettes = {};
export const getColors = (scheme) => (palettes[scheme] ??= buildColors(scheme === "light" ? "light" : "dark"));

// Paleta escura fixa: para telas que são sempre escuras (visualizador de imagem/vídeo).
export const darkColors = getColors("dark");

/* ---------- contexto ---------- */

const ThemeContext = createContext({
  colors: darkColors,
  scheme: "dark",
  isDark: true,
  preference: "dark",
  setPreference: () => {},
});

// Faz os componentes nativos (diálogos, teclado, barra de status) seguirem a escolha do app.
const applyPreference = (preference) => {
  try {
    // React Native 0.86 requires a non-null value; "unspecified" clears the override.
    Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
  } catch {
    // versões/plataformas sem suporte: o app continua seguindo o sistema.
  }
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState(DEFAULT_PREFERENCE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    secureGet(STORAGE_KEY).then((saved) => {
      if (!active) return;
      const next = THEME_PREFERENCES.includes(saved) ? saved : DEFAULT_PREFERENCE;
      applyPreference(next);
      setPreferenceState(next);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next) => {
    if (!THEME_PREFERENCES.includes(next)) return;
    applyPreference(next);
    setPreferenceState(next);
    secureSet(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme = preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;

  const value = useMemo(
    () => ({ colors: getColors(scheme), scheme, isDark: scheme === "dark", preference, setPreference }),
    [scheme, preference, setPreference],
  );

  // espera ler a preferência salva (evita piscar no esquema errado)
  if (!ready) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;

// StyleSheet que depende das cores: `factory` deve ser uma função de módulo `(colors) => StyleSheet.create({...})`.
// O resultado é guardado por (factory, esquema), então listas grandes não recriam estilos a cada item.
const styleCache = new WeakMap();
export function useStyles(factory) {
  const colors = useColors();
  let byColors = styleCache.get(factory);
  if (!byColors) {
    byColors = new WeakMap();
    styleCache.set(factory, byColors);
  }
  let styles = byColors.get(colors);
  if (!styles) {
    styles = factory(colors);
    byColors.set(colors, styles);
  }
  return styles;
}
