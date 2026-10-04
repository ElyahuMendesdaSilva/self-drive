// src/components/ScreenHeader.js — cabeçalho simples (voltar + título + ação) das telas fora das abas.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, useStyles } from "../lib/theme";

export default function ScreenHeader({ title, onBack, right, children }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Voltar">
        <Ionicons name="arrow-back" size={24} color={colors.onSurfaceVariant} />
      </Pressable>
      {children ?? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      )}
      {right}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  title: { flex: 1, color: colors.onSurface, fontSize: 20 },
});
