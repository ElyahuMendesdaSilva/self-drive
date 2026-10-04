import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { normalizeHost } from "../lib/host";
import { useColors, useStyles } from "../lib/theme";


export default function SettingsLoginDialog({
  visible,
  initialHost = "",
  onClose,
  onSave,
}) {
  const colors = useColors();
  const styles = useStyles(createStyles);
  const [host, setHost] = useState(initialHost);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");

  // sempre que o dialog abrir, volta para o valor salvo
  useEffect(() => {
    if (visible) {
      setHost(initialHost);
      setError("");
    }
  }, [visible, initialHost]);

  const handleConfirm = async () => {
    const normalized = normalizeHost(host);
    if (!normalized) {
      setError("Endereço inválido. Exemplo: 192.168.0.10:3000");
      return;
    }
    try {
      await onSave(normalized);
      onClose();
    } catch (saveError) {
      setError(saveError?.message || "Não foi possível salvar o endereço.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose} // botão voltar do Android
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* toque fora do dialog fecha */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.dialog}>
          <Ionicons name="server-outline" size={24} color={colors.primary} />
          <Text style={styles.title}>Configurações do Host</Text>
          <Text style={styles.description}>
            Informe o endereço do servidor do Self-Drive. Funciona com http:// e https://.
          </Text>

          <View style={styles.fieldWrapper}>
            <View
              style={[
                styles.field,
                focused && { borderColor: colors.primary, borderWidth: 2 },
                !!error && { borderColor: colors.error, borderWidth: 2 },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  Platform.OS === "web" && { outlineStyle: "none" },
                ]}
                value={host}
                onChangeText={(t) => {
                  setHost(t);
                  if (error) setError("");
                }}
                placeholder="http://192.168.0.10:3000"
                placeholderTextColor={colors.onSurfaceVariant}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>
            <Text
              style={[
                styles.label,
                focused && { color: colors.primary },
                !!error && { color: colors.error },
              ]}
            >
              Host
            </Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.textButton,
                pressed && styles.pressed,
              ]}
              onPress={onClose}
            >
              <Text style={styles.textButtonLabel}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.textButton,
                pressed && styles.pressed,
              ]}
              onPress={handleConfirm}
            >
              <Text style={styles.textButtonLabel}>Salvar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 28,
    padding: 24,
  },
  title: {
    color: colors.onSurface,
    fontSize: 24,
    marginTop: 16,
  },
  description: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    marginTop: 12,
    marginBottom: 28,
  },
  fieldWrapper: {
    width: "100%",
  },
  field: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 56,
    justifyContent: "center",
  },
  input: {
    color: colors.onSurface,
    fontSize: 16,
    height: "100%",
  },
  label: {
    position: "absolute",
    top: -9,
    left: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.surfaceContainerHigh,
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
    gap: 8,
  },
  textButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  pressed: {
    backgroundColor: colors.pressed,
  },
  textButtonLabel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
});
