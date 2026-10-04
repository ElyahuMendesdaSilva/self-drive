// src/components/settings/FormDialog.js — diálogo com vários campos (senha, código, nome…).
// `fields`: [{ key, label, secure, numeric, initial }]. `info`: texto selecionável opcional (ex.: chave do 2FA).
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import LoadingSpinner from "../LoadingSpinner";
import { useColors, useStyles } from "../../lib/theme";

function Body({ title, message, info, fields, confirmLabel, danger, onSubmit, onClose, hideCancel }) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.initial ?? ""])));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    const missing = fields.find((f) => !f.optional && !String(values[f.key]).trim());
    if (missing) return setError(`Preencha: ${missing.label}.`);
    setBusy(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (cause) {
      setError(cause?.message || "Não foi possível concluir.");
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onClose} />
      <View style={styles.dialog}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          {!!info && (
            <Text selectable style={styles.info}>
              {info}
            </Text>
          )}
          {fields.map((field, index) => (
            <View key={field.key} style={styles.fieldWrapper}>
              <TextInput
                style={styles.input}
                value={String(values[field.key])}
                onChangeText={(text) => {
                  setValues((current) => ({ ...current, [field.key]: field.numeric ? text.replace(/[^0-9]/g, "") : text }));
                  if (error) setError("");
                }}
                placeholder={field.label}
                placeholderTextColor={colors.onSurfaceVariant}
                secureTextEntry={Boolean(field.secure)}
                keyboardType={field.numeric ? "number-pad" : "default"}
                autoFocus={index === 0}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                returnKeyType={index === fields.length - 1 ? "done" : "next"}
                onSubmitEditing={index === fields.length - 1 ? confirm : undefined}
              />
            </View>
          ))}
          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
        <View style={styles.actions}>
          {!hideCancel && (
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onClose} disabled={busy}>
              <Text style={styles.buttonLabel}>Cancelar</Text>
            </Pressable>
          )}
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={confirm} disabled={busy}>
            {busy ? (
              <LoadingSpinner size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.buttonLabel, danger && { color: colors.error }]}>{confirmLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// O conteúdo só existe enquanto o Modal está visível, então o estado nasce limpo a cada abertura.
export default function FormDialog({ visible, title, message, info, fields = [], confirmLabel = "OK", danger, hideCancel, onSubmit, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Body
        title={title}
        message={message}
        info={info}
        fields={fields}
        confirmLabel={confirmLabel}
        danger={danger}
        hideCancel={hideCancel}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim, alignItems: "center", justifyContent: "center" },
  dialog: { width: "90%", maxWidth: 420, maxHeight: "85%", backgroundColor: colors.surfaceContainerHigh, borderRadius: 28, padding: 24 },
  title: { color: colors.onSurface, fontSize: 22, marginBottom: 12 },
  message: { color: colors.onSurfaceVariant, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  info: {
    color: colors.onSurface,
    fontSize: 14,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  fieldWrapper: { marginTop: 8 },
  input: { color: colors.onSurface, fontSize: 16, height: 52, borderWidth: 1, borderColor: colors.outline, borderRadius: 8, paddingHorizontal: 14 },
  error: { color: colors.error, fontSize: 13, marginTop: 10 },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20, gap: 8 },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 100, minWidth: 64, alignItems: "center" },
  pressed: { backgroundColor: colors.pressed },
  buttonLabel: { color: colors.primary, fontSize: 14, fontWeight: "500" },
});
