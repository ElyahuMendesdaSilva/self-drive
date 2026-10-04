// src/components/settings/EditorModal.js — tela cheia (modal) para editar um item, com botão Salvar.
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton } from "./controls";
import SettingsHeader from "./SettingsHeader";
import { useStyles } from "../../lib/theme";

export default function EditorModal({ visible, title, onClose, onSave, saving, saveLabel = "Salvar", children }) {
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <SettingsHeader title={title} onBack={onClose} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
          {onSave && <ActionButton label={saveLabel} icon="checkmark" filled busy={saving} onPress={onSave} />}
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
});
