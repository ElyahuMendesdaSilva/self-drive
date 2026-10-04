// src/components/settings/SettingsCard.js — cartão de um tópico: ícone em quadrado + título azul + descrição.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors, useStyles } from "../../lib/theme";

export default function SettingsCard({ icon, title, description, onPress }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <Ionicons name={icon} size={24} color={colors.onSurface} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text
          style={styles.description}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 8,
    height:78
  },
  pressed: { backgroundColor: colors.pressed },
  tile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: { flex: 1, paddingRight: 12, paddingVertical: 4 },
  title: { color: colors.primary, fontSize: 18 },
  description: { color: colors.onSurface, fontSize: 16, marginTop: 2 },
});
