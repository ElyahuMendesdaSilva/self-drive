// src/components/FileMenu.js — folha inferior com as ações de um arquivo/pasta.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, useStyles } from "../lib/theme";

// actions: [{ icon, label, onPress, danger? }]
export default function FileMenu({ visible, title, icon = "document-text", iconColor, actions = [], onClose }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.header}>
            <Ionicons name={icon} size={24} color={iconColor ?? colors.primary} />
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View style={styles.divider} />
          <ScrollView bounces={false}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                onPress={() => {
                  onClose();
                  // espera a folha fechar antes de abrir outro diálogo (evita falhas no iOS)
                  setTimeout(action.onPress, 250);
                }}
              >
                <Ionicons name={action.icon} size={22} color={action.danger ? colors.error : colors.onSurfaceVariant} />
                <Text style={[styles.label, action.danger && { color: colors.error }]}>{action.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "75%" },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 14 },
  title: { flex: 1, color: colors.onSurface, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.outlineVariant },
  option: { flexDirection: "row", alignItems: "center", gap: 20, paddingVertical: 16, paddingHorizontal: 24 },
  pressed: { backgroundColor: colors.pressed },
  label: { color: colors.onSurface, fontSize: 16 },
});
