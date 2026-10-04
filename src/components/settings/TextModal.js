// src/components/settings/TextModal.js — mostra um texto longo e somente leitura (análises, configuração do servidor).
import { Platform, StyleSheet, Text } from "react-native";

import EditorModal from "./EditorModal";
import { useStyles } from "../../lib/theme";

export default function TextModal({ visible, title, text, onClose }) {
  const styles = useStyles(createStyles);
  return (
    <EditorModal visible={visible} title={title} onClose={onClose}>
      <Text selectable style={styles.text}>
        {text}
      </Text>
    </EditorModal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  text: {
    color: colors.onSurface,
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
