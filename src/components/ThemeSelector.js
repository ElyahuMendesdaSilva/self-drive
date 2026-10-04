// src/components/ThemeSelector.js — escolha do tema: seguir o sistema, claro ou escuro.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors, useStyles, useTheme } from "../lib/theme";

const OPTIONS = [
  { value: "system", label: "Sistema", icon: "phone-portrait-outline" },
  { value: "light", label: "Claro", icon: "sunny-outline" },
  { value: "dark", label: "Escuro", icon: "moon-outline" },
];

export default function ThemeSelector() {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const { preference, setPreference } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Aparência</Text>
      <View style={styles.track} accessibilityRole="radiogroup">
        {OPTIONS.map((option) => {
          const selected = option.value === preference;
          const tint = selected ? colors.onPrimaryContainer : colors.onSurfaceVariant;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              style={({ pressed }) => [styles.segment, selected && styles.segmentSelected, pressed && !selected && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Tema ${option.label}`}
            >
              <Ionicons name={selected ? "checkmark" : option.icon} size={18} color={tint} />
              <Text style={[styles.label, { color: tint }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    marginBottom: 15,
  },
  title: { color: colors.onSurface, fontSize: 15, fontWeight: "500", marginBottom: 12 },
  track: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 20,
  },
  segmentSelected: { backgroundColor: colors.primaryContainer },
  pressed: { backgroundColor: colors.pressed },
  label: { fontSize: 14, fontWeight: "500" },
});
