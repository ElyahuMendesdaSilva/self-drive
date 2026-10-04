// src/components/Toast.js — aviso curto (ou progresso) no rodapé da tela.
import { StyleSheet, Text, View } from "react-native";
import LoadingSpinner from "./LoadingSpinner";
import { useColors, useStyles } from "../lib/theme";

export default function Toast({ message, busy }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  if (!message) return null;
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.toast}>
        {busy && <LoadingSpinner size="small" color={colors.primary} />}
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { position: "absolute", left: 16, right: 16, bottom: 92, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  text: { color: colors.onSurface, fontSize: 14, flexShrink: 1 },
});
