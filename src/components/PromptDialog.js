// src/components/PromptDialog.js — diálogo de uma linha de texto (nova pasta, renomear).
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors, useStyles } from "../lib/theme";


// O conteúdo só existe enquanto o Modal está visível, então o estado nasce limpo a cada abertura.
function PromptBody({ title, label, initialValue, confirmLabel, onSubmit, onClose }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(true);

  const confirm = () => {
    const name = value.trim();
    if (!name) return setError("Informe um nome.");
    if (/[\\/]/.test(name)) return setError("O nome não pode conter / ou \\.");
    onSubmit(name);
  };

  return (
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.dialog}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.fieldWrapper}>
          <View style={[styles.field, focused && styles.fieldFocused, !!error && styles.fieldError]}>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(text) => {
                setValue(text);
                if (error) setError("");
              }}
              autoFocus
              selectTextOnFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={confirm}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </View>
          <Text style={[styles.label, focused && { color: colors.primary }, !!error && { color: colors.error }]}>{label}</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
        <View style={styles.actions}>
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onClose}>
            <Text style={styles.buttonLabel}>Cancelar</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={confirm}>
            <Text style={styles.buttonLabel}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function PromptDialog({ visible, title, label = "Nome", initialValue = "", confirmLabel = "OK", onSubmit, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <PromptBody
        title={title}
        label={label}
        initialValue={initialValue}
        confirmLabel={confirmLabel}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim, alignItems: "center", justifyContent: "center" },
  dialog: { width: "90%", maxWidth: 400, backgroundColor: colors.surfaceContainerHigh, borderRadius: 28, padding: 24 },
  title: { color: colors.onSurface, fontSize: 24, marginBottom: 24 },
  fieldWrapper: { width: "100%" },
  field: { borderWidth: 1, borderColor: colors.outline, borderRadius: 4, paddingHorizontal: 14, height: 56, justifyContent: "center" },
  fieldFocused: { borderColor: colors.primary, borderWidth: 2 },
  fieldError: { borderColor: colors.error, borderWidth: 2 },
  input: { color: colors.onSurface, fontSize: 16, height: "100%" },
  label: {
    position: "absolute",
    top: -9,
    left: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.surfaceContainerHigh,
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  error: { color: colors.error, fontSize: 12, marginTop: 6, marginLeft: 14 },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 24, gap: 8 },
  button: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 100 },
  pressed: { backgroundColor: colors.pressed },
  buttonLabel: { color: colors.primary, fontSize: 14, fontWeight: "500" },
});
